import json
import os
import pwd
import re
import shutil
from pathlib import Path


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
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(tmp, path)


def load_metadata():
    return _read_json(META_FILE, {})


def save_metadata(data):
    _write_json_atomic(META_FILE, data)


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
    metadata = load_metadata()
    cache = load_cache()
    new_cache = {}
    sessions = []

    if not PROJECTS_DIR.exists():
        return sessions

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
    return sessions


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


def application(environ, start_response):
    path = environ.get('PATH_INFO', '') or '/'
    method = environ.get('REQUEST_METHOD', 'GET').upper()

    if path in ('/sessions', '/sessions/'):
        if method == 'GET':
            return json_response(start_response, {'sessions': list_sessions()})
        return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')

    m = re.match(r'^/sessions/([0-9a-fA-F-]{36})$', path)
    if m:
        sid = m.group(1)

        if method in ('PATCH', 'POST', 'PUT'):
            payload = read_body(environ)
            metadata = load_metadata()
            entry = metadata.get(sid, {})
            for key in ('name', 'description', 'favorite', 'deleted'):
                if key in payload:
                    val = payload[key]
                    if key in ('favorite', 'deleted'):
                        val = bool(val)
                    elif isinstance(val, str):
                        val = val.strip()
                    entry[key] = val
            # Drop empty defaults to keep file clean
            if not entry.get('name') and not entry.get('description') and not entry.get('favorite') and not entry.get('deleted'):
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
            metadata = load_metadata()
            if sid in metadata:
                metadata.pop(sid, None)
                save_metadata(metadata)
            return json_response(start_response, {'ok': True, 'deleted': sid})

        return json_response(start_response, {'error': 'method not allowed'}, '405 Method Not Allowed')

    return json_response(start_response, {'error': 'not found', 'path': path}, '404 Not Found')
