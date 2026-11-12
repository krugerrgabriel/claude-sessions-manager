import json
import os
import pwd
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

# Serializes read-modify-write on metadata.json. WSGIDaemonProcess runs this
# module with threads=5, so bulk operations fire concurrent PATCH/DELETE
# requests; without this lock they clobber each other's changes (lost updates).
_META_LOCK = threading.Lock()

# Serializes self-update. Two overlapping updates would race on the very files
# they are replacing, app.wsgi included. Held non-blocking: a second caller is
# told the update is already running rather than queued behind it.
_UPDATE_LOCK = threading.Lock()


def _resolve_home():
    """Resolve the home directory for the effective user of this WSGI process.
    Prefer pwd (works under mod_wsgi where HOME may not be set), fall back to
    the HOME env var, and finally to expanduser."""
    try:
        return Path(pwd.getpwuid(os.getuid()).pw_dir)
    except Exception:
        return Path(os.environ.get('HOME') or os.path.expanduser('~'))


# Base directory = folder containing this app.wsgi
BASE = Path(__file__).resolve().parent

# Allow overrides via environment (set with SetEnv in the Apache conf)
PROJECTS_DIR = Path(
    os.environ.get('CLAUDE_SESSIONS_PROJECTS_DIR')
    or (_resolve_home() / '.claude' / 'projects')
)
META_FILE = BASE / 'data' / 'metadata.json'
CACHE_FILE = BASE / 'cache' / 'sessions.json'
SETTINGS_FILE = BASE / 'data' / 'settings.json'

# 0 = off. Upper bound only guards against typos turning into nonsense.
SETTINGS_DEFAULTS = {'auto_trash_days': 0}
AUTO_TRASH_MAX_DAYS = 3650

# The git clone this was installed from, recorded by install.sh as a SetEnv.
# Apache's SetEnv lands in the per-request WSGI environ rather than the
# process environment, so the request value wins and this is only the fallback
# for someone exporting it before starting Apache.
SRC_DIR_FALLBACK = os.environ.get('CLAUDE_SESSIONS_SRC_DIR') or ''

MAX_LINES_SCAN = 200  # limit per-file scan to avoid reading huge files
PREVIEW_LEN = 400


def _read_json(path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        pass
    return default


def _write_json_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Unique tmp name per process+thread so concurrent writers never collide on
    # a shared tmp file; otherwise one thread's os.replace consumes it and the
    # other's raises FileNotFoundError (surfaced to the client as HTTP 500).
    tmp = path.with_name(f'{path.name}.{os.getpid()}.{threading.get_ident()}.tmp')
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        os.replace(tmp, path)
    except Exception:
        try:
            tmp.unlink()
        except Exception:
            pass
        raise


class MetadataUnreadable(Exception):
    """metadata.json exists but could not be read or parsed.

    Raised instead of quietly returning {}. A caller that swallowed this and
    then saved would wipe every name, note and favorite the user ever wrote.
    Write paths must refuse; read paths may degrade to "no metadata"."""


def load_metadata():
    """Return the metadata dict.

    Missing (or empty) file → {}. Present but unreadable/corrupt →
    MetadataUnreadable, so the caller can decide instead of clobbering it."""
    if not META_FILE.exists():
        return {}
    try:
        raw = META_FILE.read_text(encoding='utf-8')
    except OSError as e:
        raise MetadataUnreadable(f'cannot read {META_FILE}: {e}')
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except ValueError as e:
        raise MetadataUnreadable(f'{META_FILE} is not valid JSON: {e}')
    if not isinstance(data, dict):
        raise MetadataUnreadable(f'{META_FILE} is not a JSON object')
    return data


def save_metadata(data):
    _write_json_atomic(META_FILE, data)


def load_settings():
    data = _read_json(SETTINGS_FILE, {})
    if not isinstance(data, dict):
        data = {}
    out = dict(SETTINGS_DEFAULTS)
    try:
        days = int(data.get('auto_trash_days', 0))
    except (TypeError, ValueError):
        days = 0
    out['auto_trash_days'] = max(0, min(days, AUTO_TRASH_MAX_DAYS))
    return out


def save_settings(data):
    _write_json_atomic(SETTINGS_FILE, data)


def _inactive_since(session_mtime, meta):
    """Last moment the user showed interest in a session: its last write, or
    the last time they pulled it out of the trash by hand. Without the second
    one, restoring an old session would send it straight back next refresh."""
    kept = meta.get('kept_at') or 0
    return max(session_mtime, kept if isinstance(kept, (int, float)) else 0)


def apply_auto_trash(sessions):
    """Move sessions idle longer than the configured window to the trash, and
    bring back ones that were auto-trashed but have been used since.

    Only flips the soft-delete flag; nothing is removed from disk. Favorites
    are never touched. Returns how many sessions were trashed by this call."""
    days = load_settings()['auto_trash_days']
    now = time.time()
    cutoff = now - days * 86400
    trashed = 0
    with _META_LOCK:
        try:
            metadata = load_metadata()
        except MetadataUnreadable:
            return 0   # never write over a file we could not read
        changed = False
        for s in sessions:
            meta = metadata.get(s['id'], {})
            auto_at = meta.get('auto_trashed_at')
            if s['deleted'] and auto_at and s['mtime'] > auto_at:
                # Resumed after the dashboard trashed it: it is in use again.
                meta['deleted'] = False
                meta.pop('auto_trashed_at', None)
                s['deleted'] = False
                metadata[s['id']] = meta
                changed = True
            elif (days and not s['deleted'] and not s['favorite']
                  and _inactive_since(s['mtime'], meta) < cutoff):
                meta['deleted'] = True
                meta['auto_trashed_at'] = now
                s['deleted'] = True
                metadata[s['id']] = meta
                trashed += 1
                changed = True
            s['inactive_since'] = _inactive_since(s['mtime'], meta)
        if changed:
            save_metadata(metadata)
    return trashed


def load_cache():
    return _read_json(CACHE_FILE, {})


def save_cache(data):
    try:
        _write_json_atomic(CACHE_FILE, data)
    except Exception:
        pass  # cache is optional


def _extract_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'text':
                parts.append(item.get('text', ''))
        return '\n'.join(parts)
    return ''


_NOISE_TAGS = re.compile(
    r'<(command-name|command-message|command-args|local-command-stdout|'
    r'local-command-stderr|local-command-caveat|bash-input|bash-stdout|'
    r'bash-stderr|system-reminder|user-prompt-submit-hook)>[\s\S]*?'
    r'</\1>',
    re.IGNORECASE,
)


def _clean_command_tags(text):
    prev = None
    while prev != text:
        prev = text
        text = _NOISE_TAGS.sub('', text)
    # Drop any remaining bare tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()


def scan_session(jsonl_path):
    info = {
        'cwd': None,
        'git_branch': None,
        'first_message': None,
        'version': None,
        'context_tokens': None,
    }
    try:
        with open(jsonl_path, 'r', encoding='utf-8', errors='replace') as f:
            for i, line in enumerate(f):
                if i >= MAX_LINES_SCAN and info['first_message']:
                    break
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if not info['cwd'] and obj.get('cwd'):
                    info['cwd'] = obj['cwd']
                if not info['git_branch'] and obj.get('gitBranch'):
                    info['git_branch'] = obj['gitBranch']
                if not info['version'] and obj.get('version'):
                    info['version'] = obj['version']
                if not info['first_message'] and obj.get('type') == 'user':
                    msg = obj.get('message') or {}
                    if isinstance(msg, dict):
                        text = _clean_command_tags(_extract_text(msg.get('content', '')))
                        if text:
                            info['first_message'] = text[:PREVIEW_LEN]
    except Exception:
        pass

    # Read the file tail to find the most recent assistant usage
    # (context window size at the end of the session)
    usage = _find_last_usage(jsonl_path)
    if usage:
        tok = (usage.get('input_tokens') or 0) \
            + (usage.get('cache_read_input_tokens') or 0) \
            + (usage.get('cache_creation_input_tokens') or 0)
        if tok:
            info['context_tokens'] = tok
    return info


def _tail_bytes(path, max_bytes=64 * 1024):
    """Read the last max_bytes of a file (for tail-line parsing)."""
    try:
        with open(path, 'rb') as f:
            f.seek(0, 2)
            size = f.tell()
            start = max(0, size - max_bytes)
            f.seek(start)
            data = f.read()
        # If we didn't start at 0, drop a possibly-partial first line
        if start > 0:
            nl = data.find(b'\n')
            if nl != -1:
                data = data[nl + 1:]
        return data
    except Exception:
        return b''


def _find_last_usage(jsonl_path):
    """Scan the last chunk of the file and return the most recent assistant usage dict."""
    data = _tail_bytes(jsonl_path)
    if not data:
        return None
    last = None
    for line in data.splitlines():
        if not line or b'"usage"' not in line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if obj.get('type') != 'assistant':
            continue
        msg = obj.get('message') or {}
        u = msg.get('usage') if isinstance(msg, dict) else None
        if isinstance(u, dict):
            last = u
    return last


def count_lines(path):
    try:
        c = 0
        with open(path, 'rb') as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                c += chunk.count(b'\n')
        return c
    except Exception:
        return 0


def list_sessions():
    """Return (sessions, meta_error).

    Listing still works when metadata.json is unreadable: the sessions just
    come back without names/notes, but meta_error is surfaced to the client so
    the missing names read as a fault, not as "you never named anything"."""
    try:
        metadata = load_metadata()
        meta_error = None
    except MetadataUnreadable as e:
        metadata = {}
        meta_error = str(e)
    cache = load_cache()
    new_cache = {}
    sessions = []

    if not PROJECTS_DIR.exists():
        return sessions, meta_error

    for project_dir in sorted(PROJECTS_DIR.iterdir()):
        if not project_dir.is_dir():
            continue
        # Only top-level .jsonl files (skip subagents/ etc.)
        for jsonl in project_dir.glob('*.jsonl'):
            if not jsonl.is_file():
                continue
            session_id = jsonl.stem
            try:
                stat = jsonl.stat()
            except Exception:
                continue

            cache_key = str(jsonl)
            cache_entry = cache.get(cache_key)
            if cache_entry and cache_entry.get('mtime') == stat.st_mtime and cache_entry.get('size') == stat.st_size:
                info = cache_entry['info']
                line_count = cache_entry.get('line_count', 0)
            else:
                info = scan_session(jsonl)
                line_count = count_lines(jsonl)

            new_cache[cache_key] = {
                'mtime': stat.st_mtime,
                'size': stat.st_size,
                'info': info,
                'line_count': line_count,
            }

            meta = metadata.get(session_id, {})
            sessions.append({
                'id': session_id,
                'project_folder': project_dir.name,
                'cwd': info.get('cwd'),
                'git_branch': info.get('git_branch'),
                'version': info.get('version'),
                'first_message': info.get('first_message'),
                'context_tokens': info.get('context_tokens'),
                'line_count': line_count,
                'mtime': stat.st_mtime,
                'size': stat.st_size,
                'name': meta.get('name', ''),
                'description': meta.get('description', ''),
                'favorite': bool(meta.get('favorite', False)),
                'deleted': bool(meta.get('deleted', False)),
            })

    save_cache(new_cache)
    sessions.sort(key=lambda s: s['mtime'], reverse=True)
    return sessions, meta_error


def find_session_file(session_id):
    if not re.fullmatch(r'[0-9a-fA-F-]{36}', session_id):
        return None
    for project_dir in PROJECTS_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        f = project_dir / f'{session_id}.jsonl'
        if f.exists():
            return f
    return None


def json_response(start_response, data, status='200 OK'):
    body = json.dumps(data, ensure_ascii=False).encode('utf-8')
    start_response(status, [
        ('Content-Type', 'application/json; charset=utf-8'),
        ('Content-Length', str(len(body))),
        ('Cache-Control', 'no-store'),
    ])
    return [body]


def read_body(environ):
    try:
        length = int(environ.get('CONTENT_LENGTH') or 0)
    except ValueError:
        length = 0
    if length <= 0:
        return {}
    raw = environ['wsgi.input'].read(length)
    try:
        return json.loads(raw.decode('utf-8'))
    except Exception:
        return {}


def cwd_to_folder(cwd):
    """Encode an absolute cwd path to the Claude project folder name.
    Mirrors how Claude Code names directories under ~/.claude/projects/:
    EVERY character outside [A-Za-z0-9] collapses to '-', not just the path
    separators. Underscores, dots, spaces and accented letters all fold too;
    case is preserved.
        '/home/u/proj'      → '-home-u-proj'
        '/home/u/my_app'    → '-home-u-my-app'
        '/home/u/Lideranca' → '-home-u-Lideran-a'   (with a cedilla)
    Getting this wrong drops the moved session into a folder Claude Code never
    reads, so `claude --resume <id>` can no longer find it."""
    return re.sub(r'[^A-Za-z0-9]', '-', cwd)


def move_session(sid, target_cwd):
    """Move a session file to the project folder for target_cwd, rewriting
    the `cwd` field on every line. gitBranch is left untouched.
    Returns (status_code, payload_dict).
    """
    if not target_cwd or not isinstance(target_cwd, str):
        return 400, {'error': 'invalid target_cwd'}
    target_cwd = target_cwd.strip()
    if (not target_cwd
        or not target_cwd.startswith('/')
        or '\x00' in target_cwd
        or any(p == '..' for p in target_cwd.split('/'))):
        return 400, {'error': 'invalid target_cwd'}
    src = find_session_file(sid)
    if not src:
        return 404, {'error': 'not found'}

    target_folder = cwd_to_folder(target_cwd)
    dst_dir = src.parent.parent / target_folder
    dst = dst_dir / f'{sid}.jsonl'

    # No-op if already there
    try:
        if src.resolve() == dst.resolve():
            return 200, {'ok': True, 'noop': True, 'id': sid,
                         'project_folder': target_folder, 'cwd': target_cwd}
    except Exception:
        pass

    if dst.exists():
        return 409, {'error': 'a session with this id already exists in target project'}

    tmp = None
    try:
        dst_dir.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_suffix('.jsonl.tmp')
        with open(src, 'r', encoding='utf-8', errors='replace') as fr, \
             open(tmp, 'w', encoding='utf-8') as fw:
            for line in fr:
                line = line.rstrip('\n')
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict) and 'cwd' in obj:
                        obj['cwd'] = target_cwd
                    fw.write(json.dumps(obj, ensure_ascii=False) + '\n')
                except Exception:
                    fw.write(line + '\n')
        os.replace(tmp, dst)
        tmp = None

        # Move any subagent/session subdirectory alongside
        sub_src = src.parent / sid
        if sub_src.exists() and sub_src.is_dir():
            sub_dst = dst_dir / sid
            if not sub_dst.exists():
                shutil.move(str(sub_src), str(sub_dst))

        src.unlink()
    except Exception as e:
        if tmp is not None:
            try: tmp.unlink()
            except Exception: pass
        return 500, {'error': str(e)}

    return 200, {'ok': True, 'id': sid,
                 'project_folder': target_folder, 'cwd': target_cwd}


# Files install.sh copies into place. Kept in sync with its copy loop; app.wsgi
# goes last so the mod_wsgi reload it triggers finds everything else already
# updated.
INSTALL_FILES = ('index.html', 'style.css', 'VERSION', 'app.js', 'app.wsgi')


def _is_local(environ):
    """True only for requests originating on this machine.

    The update endpoint runs git and rewrites the running application, so it is
    restricted here regardless of how permissive the Apache config happens to
    be."""
    return environ.get('REMOTE_ADDR') in ('127.0.0.1', '::1')


def _is_local_host_header(environ):
    """Reject a Host that is not a loopback name.

    REMOTE_ADDR alone is not enough: in a DNS rebinding attack a page served
    from evil.com has its name re-pointed at 127.0.0.1, so the request is
    same-origin for the browser (no CORS to block it) and arrives on loopback
    (so REMOTE_ADDR passes). The Host header is what still says 'evil.com'."""
    host = (environ.get('HTTP_HOST') or '').strip().lower()
    if host.startswith('['):
        # IPv6 literal: [::1] or [::1]:8080. Splitting on ':' first would cut
        # the address itself in half.
        host = host[1:].split(']', 1)[0]
    else:
        host = host.rsplit(':', 1)[0]
    return host in ('localhost', '127.0.0.1', '::1', '')


def _copy_atomic(src, dst):
    """Copy via a temp file plus os.replace, the same idiom as
    _write_json_atomic. A plain copyfile truncates the destination first, and
    the destination here includes app.wsgi: an interrupted write would leave
    the entire API unable to import."""
    tmp = dst.with_name(f'{dst.name}.{os.getpid()}.{threading.get_ident()}.tmp')
    try:
        shutil.copyfile(src, tmp)
        os.replace(tmp, dst)
    except Exception:
        try:
            tmp.unlink()
        except Exception:
            pass
        raise


_ASSET_STAMP = re.compile(r'((?:href|src)="(?:style\.css|app\.js))(\?v=[^"]*)?"')
_CONF_HEREDOC = re.compile(r'cat > "\$CONF_FILE" <<EOF\n(.*?)\nEOF\n', re.S)
_A2EN = re.compile(r'^\s*a2en\w+\s+.*$', re.M)


def _root_surface(installer_bytes):
    """The parts of install.sh that actually need root.

    Namely the generated Apache config and the module enables. Everything else
    in the installer, copying files, printing progress, is work the dashboard
    already does for itself during a self-update, so a change there is no
    reason to send the user to a terminal.

    Falls back to the whole file when the config block cannot be located, which
    errs toward asking for the terminal rather than silently skipping a change
    that did need it."""
    try:
        text = installer_bytes.decode('utf-8')
    except (UnicodeDecodeError, AttributeError):
        return installer_bytes
    m = _CONF_HEREDOC.search(text)
    if not m:
        return installer_bytes
    return '\n'.join([m.group(1)] + _A2EN.findall(text)).encode('utf-8')


def _stamp_assets(index_html, version):
    """Append ?v=<version> to the stylesheet and script URLs.

    Mirrors what install.sh does at install time. Apache sends no
    Cache-Control for these two, only index.html and the dictionaries
    revalidate, so browsers cache them heuristically for days; a stamped URL
    is one such a cache has never seen,
    which is what stops an update from rendering with the previous release's
    CSS. The reload after a self-update revalidates index.html itself, so the
    new stamps are picked up.

    The repo copy stays unstamped, so this runs on every update rather than
    shipping a stamp that would go stale. Idempotent: an existing stamp is
    replaced, not stacked."""
    try:
        html = index_html.read_text(encoding='utf-8')
    except OSError:
        return
    stamped = _ASSET_STAMP.sub(lambda m: f'{m.group(1)}?v={version}"', html)
    if stamped != html:
        tmp = index_html.with_name(f'{index_html.name}.stamp.tmp')
        try:
            tmp.write_text(stamped, encoding='utf-8')
            os.replace(tmp, index_html)
        except OSError:
            try:
                tmp.unlink()
            except Exception:
                pass


def _git(args, cwd, timeout=120):
    p = subprocess.run(['git', '-C', str(cwd)] + args,
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, ((p.stdout or '') + (p.stderr or '')).strip()


def self_update(src_dir):
    """Pull the clone this was installed from and copy the new files into place.

    Returns (status_code, body). The dashboard runs as the invoking user and
    owns its own install directory, so nothing here needs root. What does need
    root is Apache: whenever install.sh itself changed between the two
    revisions the release may also change the vhost config, so we stop and ask
    for the terminal rather than apply half an update."""
    if not src_dir:
        return 409, {'ok': False, 'reason': 'no-source',
                     'detail': 'CLAUDE_SESSIONS_SRC_DIR is not set. Reinstall once '
                               'so the dashboard learns where its clone lives.'}
    src = Path(src_dir)
    if not (src / '.git').exists():
        return 409, {'ok': False, 'reason': 'no-source',
                     'detail': f'{src} is not a git clone.'}

    command = f'cd {src} && sudo ./install.sh'

    try:
        # Tracked changes only: an untracked stray (a __pycache__, an editor
        # backup) does not stand in the way of a fast-forward, and treating it
        # as dirty would block self-update forever for no reason. A pull that
        # genuinely would overwrite an untracked file fails on its own below.
        rc, out = _git(['status', '--porcelain', '--untracked-files=no'], src)
        if rc != 0:
            return 409, {'ok': False, 'reason': 'git', 'detail': out, 'command': command}
        if out:
            # Never discard the user's own edits to their clone.
            return 409, {'ok': False, 'reason': 'dirty', 'command': command,
                         'detail': 'The clone has uncommitted changes:\n' + out}

        installer = src / 'install.sh'
        before = _root_surface(installer.read_bytes() if installer.exists() else b'')

        rc, out = _git(['pull', '--ff-only'], src)
        if rc != 0:
            return 409, {'ok': False, 'reason': 'git', 'detail': out, 'command': command}

        if _root_surface(installer.read_bytes() if installer.exists() else b'') != before:
            # The pull already landed, so only the installer is still pending.
            return 409, {'ok': False, 'reason': 'installer', 'command': command,
                         'detail': 'The Apache configuration changed in this '
                                   'release, which needs root.'}

        if src.resolve() != BASE.resolve():
            for name in INSTALL_FILES:
                s = src / name
                if s.exists():
                    _copy_atomic(s, BASE / name)
            i18n_src = src / 'i18n'
            if i18n_src.is_dir():
                (BASE / 'i18n').mkdir(exist_ok=True)
                for f in i18n_src.glob('*.json'):
                    _copy_atomic(f, BASE / 'i18n' / f.name)
            # Release notes, nested one directory per version.
            notes_src = src / 'notes'
            if notes_src.is_dir():
                for f in notes_src.rglob('*.md'):
                    dst = BASE / 'notes' / f.relative_to(notes_src)
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    _copy_atomic(f, dst)

        try:
            version = (BASE / 'VERSION').read_text(encoding='utf-8').strip()
        except OSError:
            version = ''
        if version:
            _stamp_assets(BASE / 'index.html', version)
        return 200, {'ok': True, 'version': version}
    except subprocess.TimeoutExpired:
        return 409, {'ok': False, 'reason': 'git', 'command': command,
                     'detail': 'git timed out. Check the network and try again.'}
    except FileNotFoundError:
        return 409, {'ok': False, 'reason': 'git', 'command': command,
                     'detail': 'git is not installed.'}
    except OSError as e:
        return 409, {'ok': False, 'reason': 'copy', 'command': command, 'detail': str(e)}


def application(environ, start_response):
    path = environ.get('PATH_INFO', '') or '/'
    method = environ.get('REQUEST_METHOD', 'GET').upper()

    if path in ('/update', '/update/'):
        if method != 'POST':
            return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')
        if not _is_local(environ) or not _is_local_host_header(environ):
            return json_response(start_response, {'error': 'local requests only'}, '403 Forbidden')
        # A custom header cannot be sent cross-origin without a CORS preflight,
        # and no CORS headers are served here, so this also stops a hostile page
        # in the user's own browser from triggering an update.
        if not environ.get('HTTP_X_CS_UPDATE'):
            return json_response(start_response, {'error': 'missing X-CS-Update header'}, '403 Forbidden')
        if not _UPDATE_LOCK.acquire(blocking=False):
            return json_response(start_response, {
                'ok': False, 'reason': 'busy',
                'detail': 'An update is already running.',
            }, '409 Conflict')
        try:
            code, body = self_update(environ.get('CLAUDE_SESSIONS_SRC_DIR') or SRC_DIR_FALLBACK)
        finally:
            _UPDATE_LOCK.release()
        return json_response(start_response, body,
                             '200 OK' if code == 200 else '409 Conflict')

    if path in ('/sessions', '/sessions/'):
        if method == 'GET':
            sessions, meta_error = list_sessions()
            auto_trashed = 0 if meta_error else apply_auto_trash(sessions)
            payload = {'sessions': sessions, 'auto_trashed': auto_trashed}
            if meta_error:
                payload['meta_error'] = meta_error
            return json_response(start_response, payload)
        return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')

    if path in ('/settings', '/settings/'):
        if method == 'GET':
            return json_response(start_response, load_settings())
        if method in ('PUT', 'PATCH', 'POST'):
            payload = read_body(environ)
            current = load_settings()
            if 'auto_trash_days' in payload:
                try:
                    days = int(payload['auto_trash_days'])
                except (TypeError, ValueError):
                    return json_response(start_response, {'error': 'auto_trash_days must be an integer'}, '400 Bad Request')
                if days < 0 or days > AUTO_TRASH_MAX_DAYS:
                    return json_response(start_response, {'error': f'auto_trash_days must be between 0 and {AUTO_TRASH_MAX_DAYS}'}, '400 Bad Request')
                current['auto_trash_days'] = days
            save_settings(current)
            return json_response(start_response, current)
        return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')

    m_move = re.match(r'^/sessions/([0-9a-fA-F-]{36})/move$', path)
    if m_move:
        sid = m_move.group(1)
        if method != 'POST':
            return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')
        payload = read_body(environ)
        status_code, body = move_session(sid, payload.get('target_cwd', ''))
        status_map = {200: '200 OK', 400: '400 Bad Request', 404: '404 Not Found',
                      409: '409 Conflict', 500: '500 Internal Server Error'}
        return json_response(start_response, body, status_map.get(status_code, '500 Internal Server Error'))

    m = re.match(r'^/sessions/([0-9a-fA-F-]{36})$', path)
    if m:
        sid = m.group(1)

        if method in ('PATCH', 'POST', 'PUT'):
            payload = read_body(environ)
            with _META_LOCK:
                try:
                    metadata = load_metadata()
                except MetadataUnreadable as e:
                    # Never save on top of a file we could not read: doing so
                    # replaces every name/note/favorite with this one entry.
                    return json_response(start_response, {
                        'error': f'{e}. Refusing to overwrite it. '
                                 f'Fix or move the file, then retry.',
                    }, '503 Service Unavailable')
                entry = metadata.get(sid, {})
                for key in ('name', 'description', 'favorite', 'deleted'):
                    if key in payload:
                        val = payload[key]
                        if key in ('favorite', 'deleted'):
                            val = bool(val)
                        elif isinstance(val, str):
                            val = val.strip()
                        entry[key] = val
                if 'deleted' in payload:
                    # Any manual trash/restore overrides the automatic one.
                    entry.pop('auto_trashed_at', None)
                    if not entry['deleted']:
                        entry['kept_at'] = time.time()
                # Drop empty defaults to keep file clean
                if not entry.get('name') and not entry.get('description') and not entry.get('favorite') and not entry.get('deleted') and not entry.get('kept_at'):
                    metadata.pop(sid, None)
                else:
                    metadata[sid] = entry
                save_metadata(metadata)
            return json_response(start_response, {'ok': True, 'id': sid, 'meta': entry})

        if method == 'DELETE':
            f = find_session_file(sid)
            if not f:
                return json_response(start_response, {'error': 'not found'}, '404 Not Found')
            try:
                f.unlink()
                sub = f.parent / sid
                if sub.exists() and sub.is_dir():
                    shutil.rmtree(sub, ignore_errors=True)
            except PermissionError as e:
                return json_response(start_response, {'error': f'permission denied: {e}'}, '403 Forbidden')
            except Exception as e:
                return json_response(start_response, {'error': str(e)}, '500 Internal Server Error')
            with _META_LOCK:
                try:
                    metadata = load_metadata()
                except MetadataUnreadable:
                    # The .jsonl is already gone, which is what the user asked
                    # for. Skip the bookkeeping rather than rewrite a file we
                    # can't read. The leftover entry is keyed by a session id
                    # that no longer exists, so it is inert.
                    metadata = None
                if metadata is not None and sid in metadata:
                    metadata.pop(sid, None)
                    save_metadata(metadata)
            return json_response(start_response, {'ok': True, 'deleted': sid})

        return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')

    return json_response(start_response, {'error': 'not found', 'path': path}, '404 Not Found')
