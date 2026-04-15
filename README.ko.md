<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong><a href="https://claude.com/claude-code">Claude Code</a>를 위한 매일의 시작점.</strong><br>
  어떤 대화든 중단한 지점에서 바로 이어서 — 프로젝트를 다시 설명하지 않아도, 컨텍스트를 잃지 않습니다.
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> ·
  <strong>🇰🇷 한국어</strong> ·
  <a href="README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 왜 사용하는가

모든 프로젝트에는 숨은 비용이 있습니다: **컨텍스트 재가열**. Claude를 열 때마다 시간이 낭비됩니다:

- 🔁 아키텍처 재설명
- 📍 멈춘 지점 설명
- 📂 중요한 파일 지목
- 🧠 진행 중이던 작업 재정렬

**생산성을 내기 시작할 때까지 15–30분**이 걸립니다. 그리고 터미널을 닫으면 Claude가 막 쌓아 올린 컨텍스트도 함께 사라집니다.

✨ **좋은 소식:** Claude Code는 이미 모든 대화를 저장해 두어 이어갈 수 있게 합니다.

😩 **문제:** 자동 생성된 수십 개의 코드 중에서 올바른 대화를 찾는 일.

이 프로젝트가 해결하는 문제입니다. 4단계로:

1. 🏁 대시보드를 엽니다
2. 🎯 올바른 대화를 찾습니다
3. 📋 클릭 — 명령어가 이미 클립보드에 있습니다
4. 💻 터미널에 붙여넣고 중단한 지점에서 계속

> **이어가기는 몇 초. 다시 시작하기는 몇 시간.**

---

## ✨ 기능

| | |
|---|---|
| 🔁 **원클릭 재개** | 대화 클릭 → 재개 명령어가 즉시 클립보드로 복사 |
| 🏷️ **이름과 메모** | 각 대화에 사람이 읽기 쉬운 이름을 붙이고 멈춘 위치 메모 |
| ⭐ **즐겨찾기** | 매일 사용하는 대화를 돋보이게 |
| 🗑️ **안전한 휴지통** | 오래된 대화를 걱정 없이 보관 — 영구 삭제에는 이중 확인 필요 |
| 🔍 **즉시 검색** | 이름, 메모, 프로젝트, 브랜치 또는 대화 내용으로 필터링 |
| 📁 **프로젝트별 그룹** | 소속 프로젝트 기준으로 정리, 사이드바에 카운터 |
| 📊 **유용한 정보** | 사용된 컨텍스트, 크기, 브랜치, 최근 활동 — 카드에 모두 표시 |
| 🌡️ **포화 경고** | 컨텍스트 창에 거의 찬 대화는 노란색과 빨간색으로 강조 |
| ⌨️ **키보드 단축키** | `/` 검색, `Esc` 닫기, `Enter` 재개 — 손을 키보드에서 떼지 않고 |
| 🌗 **부드러운 다크 테마** | 장시간 화면 작업을 위한 디자인, Claude에서 영감을 받은 테라코타 포인트 컬러 |
| ♿ **접근성** | 키보드 내비게이션, 적절한 대비, 시스템의 "동작 줄이기" 설정 존중 |

---

## 📦 설치

### 1️⃣ 저장소 복제

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ 설치 스크립트 실행

```bash
sudo ./install.sh
```

설치 스크립트가 모든 것을 처리합니다 — 누락된 것을 설치하고, 파일을 복사하고, 권한을 조정하며 웹 서버를 구성합니다. 몇 초면 끝납니다.

### 3️⃣ 브라우저에서 열기

두 가지 방법 중 선택하세요:

🖥️ **URL로 직접:** http://localhost/claude-sessions/

⌨️ **또는 터미널에서:**

```bash
claude-sessions
```

또는

```bash
claude-sessions-manager
```

설치 스크립트가 해당 명령을 자동으로 만듭니다 — 기본 브라우저에서 대시보드를 엽니다.

완료. 🎉

> 💡 **유일한 전제 조건:** `apt`와 `sudo`를 사용할 수 있는 Linux (Ubuntu, Debian, Mint, Pop!_OS 등).

---

## ⚙️ 고급 설정

필요할 때만 사용하세요 — 기본값으로도 잘 동작합니다.

<details>
<summary><strong>다른 경로나 URL에 설치</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
그런 다음 **http://localhost/dashboard/**를 엽니다.
</details>

<details>
<summary><strong>다른 세션 폴더 사용</strong></summary>

```bash
sudo PROJECTS_DIR=/alternative/path/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>제거</strong></summary>

```bash
sudo ./uninstall.sh           # 메모 (이름, 즐겨찾기, 설명) 유지
sudo ./uninstall.sh --purge   # 메모를 포함해 모두 제거
```
</details>

---

## ⌨️ 단축키

| 키 | 동작 |
|---|---|
| `/` | 검색창 포커스 |
| `Esc` | 모달 닫기, 검색 지우기 또는 모바일 메뉴 닫기 |
| `Enter` / `Space` | 포커스된 대화 재개 |
| `Ctrl+Enter` | 편집 저장 (모달 내) |

---

## 🏗️ 내부 동작 원리

```
┌─────────────────────────────────────────────────────────────────┐
│                        브라우저 (사용자)                         │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (정적)       │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ 읽기/쓰기
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (세션)             │
            │  data/metadata.json              (메모)             │
            │  cache/sessions.json             (내부 캐시)        │
            └─────────────────────────────────────────────────────┘
```

### 스택

| 계층 | 기술 | 이유 |
|---|---|---|
| **프론트엔드** | HTML + CSS + 바닐라 JS | 빌드 단계 없음, 100ms 미만으로 로드 |
| **백엔드** | Python 3 (stdlib) | `pip install` 없음, `venv` 없음 |
| **통합** | mod_wsgi | 최신 Apache에 포함, 사용자 권한으로 실행 |
| **영속성** | 로컬 JSON | 손으로 편집 가능한 파일에 메모 저장 |
| **폰트** | Inter + JetBrains Mono | 정보 밀도가 높은 화면에서 뛰어난 가독성 |

### 저장소 구조

```
claude-sessions-manager/
├── index.html       ← UI와 SVG 아이콘
├── style.css        ← 디자인 시스템 (다크 테마)
├── app.js           ← 렌더링과 API 로직
├── app.wsgi         ← Python 백엔드
├── install.sh       ← 설치 스크립트
├── uninstall.sh     ← 제거 스크립트
├── README.md        ← 현재 위치
├── .gitignore       ← 생성된 데이터 무시
├── data/            ← (생성됨) 메모
└── cache/           ← (생성됨) 내부 캐시
```

---

## 🔒 보안

- 백엔드는 `www-data`가 아니라 **사용자 권한으로** 실행됩니다 — 전역 `chmod` 없이 세션을 읽습니다.
- API는 UUID 형식의 ID만 허용합니다 (경로 순회 없음).
- 영구 삭제는 프론트엔드에서 이중 확인이 필요합니다.
- 기본적으로 **http://localhost**에서만 제공 — 인증 없이 **인터넷에 노출하지 마세요**.

---

## 🛠️ 개발

빌드 단계 없음. 편집하고 페이지를 새로 고침하면 됩니다.

```bash
# 백엔드를 변경한 후 mod_wsgi를 강제로 다시 로드
sudo touch /var/www/html/claude-sessions/app.wsgi

# 로그 따라 보기
sudo tail -f /var/log/apache2/error.log

# 내부 캐시 지우기 (파싱 로직을 변경한 후)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 문제 해결

<details>
<summary><strong>"세션 로드 실패"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

일반적인 원인:
- `~/.claude/projects/`가 아직 없음 — Claude Code를 한 번은 실행하세요
- `mod_wsgi`가 활성화되지 않음: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>영구 삭제 시 "Permission denied"</strong></summary>

백엔드는 파일 소유자 권한으로 실행되어야 합니다. 확인:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
해당 줄에 `user=YOUR_USERNAME`이 포함되어야 합니다.
</details>

<details>
<summary><strong>일부 세션이 표시되지 않음</strong></summary>

메인 (재개 가능한) 세션만 나열됩니다. 서브 에이전트의 내부 대화는 의도적으로 무시됩니다.
</details>

<details>
<summary><strong>백엔드를 변경했지만 UI가 업데이트되지 않음</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
브라우저에서: **Ctrl+Shift+R**로 브라우저 캐시를 비웁니다.
</details>

---

## 🤝 기여

PR을 환영합니다. 제출 전에:

- **의존성 제로** 유지 (`pip` 없음, `npm` 없음)
- `style.css`의 디자인 시스템 준수 (시맨틱 CSS 변수)
- 새 아이콘: `index.html`의 SVG 스프라이트에 `<symbol>` 추가 (Lucide 스타일, stroke 2, 24×24)

---

## 📜 라이선스

MIT — 자유롭게 사용하세요.

---

<p align="center">
  <code>vim</code>과 커피로 만들었습니다.
</p>
