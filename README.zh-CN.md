<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong><a href="https://claude.com/claude-code">Claude Code</a> 的每日起点。</strong><br>
  从中断的地方继续任何对话 — 无需重新解释项目,不会丢失上下文。
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <strong>🇨🇳 简体中文</strong> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
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

## 💡 为什么使用

每个项目都有隐藏成本:**重新加热上下文**。每次打开 Claude,你都在浪费时间:

- 🔁 重新解释架构
- 📍 指出你停下的位置
- 📂 列出重要的文件
- 🧠 重新调整正在进行的工作

这需要**15–30 分钟才能开始高效工作**。而当终端关闭时,Claude 刚刚建立的上下文也就消失了。

✨ **好消息:** Claude Code 已经保存了每一次对话供你恢复。

😩 **问题:** 如何从几十个自动生成的代码中找到正确的对话。

这就是此项目要解决的问题。只需 4 步:

1. 🏁 打开仪表板
2. 🎯 找到正确的对话
3. 📋 点击 — 命令已经在剪贴板里
4. 💻 粘贴到终端,从你停下的地方继续

> **恢复只需几秒。从头开始要几小时。**

---

## ✨ 功能

| | |
|---|---|
| 🔁 **一键恢复** | 点击对话 → 恢复命令立即复制到剪贴板 |
| 🏷️ **名称和备注** | 给每个对话起一个人类可读的名字,并记录你停下的位置 |
| ⭐ **收藏** | 突出显示你每天使用的对话 |
| 🗑️ **安全的回收站** | 放心归档旧对话 — 永久删除需要二次确认 |
| 🔍 **即时搜索** | 按名称、备注、项目、分支或对话内容筛选 |
| 📁 **按项目分组** | 对话按所属项目组织,侧边栏带计数器 |
| 📊 **有用的信息** | 已消耗上下文、大小、分支、最后活动 — 全部显示在卡片上 |
| 🌡️ **饱和警告** | 接近上下文窗口上限的对话以黄色和红色高亮 |
| ⌨️ **键盘快捷键** | `/` 搜索,`Esc` 关闭,`Enter` 恢复 — 双手不必离开键盘 |
| 🌗 **柔和暗色主题** | 为长时间屏幕工作而设计,采用受 Claude 启发的赤陶色强调 |
| ♿ **无障碍** | 键盘导航、合适的对比度,遵循系统"减少动效"设置 |

---

## 📦 安装

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ 运行安装器

```bash
sudo ./install.sh
```

安装器会处理一切 — 安装缺失的组件、复制文件、调整权限并配置 Web 服务器。几秒钟完成。

### 3️⃣ 在浏览器中打开

两种方式,任选其一:

🖥️ **直接通过 URL:** http://localhost/claude-sessions/

⌨️ **或从终端:**

```bash
claude-sessions
```

或

```bash
claude-sessions-manager
```

安装器会自动创建该命令 — 在你的默认浏览器中打开仪表板。

完成。🎉

> 💡 **唯一前置条件:** 任何带 `apt` 的 Linux (Ubuntu、Debian、Mint、Pop!_OS 等) 和 `sudo`。

---

## ⚙️ 高级配置

仅在需要时使用 — 默认配置即可运行。

<details>
<summary><strong>安装到其他路径或 URL</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
然后访问 **http://localhost/dashboard/**。
</details>

<details>
<summary><strong>使用其他会话文件夹</strong></summary>

```bash
sudo PROJECTS_DIR=/alternative/path/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>卸载</strong></summary>

```bash
sudo ./uninstall.sh           # 保留你的备注 (名称、收藏、描述)
sudo ./uninstall.sh --purge   # 删除所有内容,包括你的备注
```
</details>

---

## ⌨️ 快捷键

| 按键 | 操作 |
|---|---|
| `/` | 聚焦搜索框 |
| `Esc` | 关闭模态框、清除搜索或关闭移动端菜单 |
| `Enter` / `Space` | 恢复当前聚焦的对话 |
| `Ctrl+Enter` | 保存编辑 (模态框内) |

---

## 🏗️ 内部工作原理

```
┌─────────────────────────────────────────────────────────────────┐
│                        浏览器 (你)                               │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (静态)       │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ 读/写
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (你的会话)         │
            │  data/metadata.json              (你的备注)         │
            │  cache/sessions.json             (内部缓存)         │
            └─────────────────────────────────────────────────────┘
```

### 技术栈

| 层 | 技术 | 原因 |
|---|---|---|
| **前端** | HTML + CSS + 原生 JS | 无需构建步骤,加载 <100ms |
| **后端** | Python 3 (stdlib) | 无需 `pip install`,无需 `venv` |
| **集成** | mod_wsgi | 现代 Apache 自带,以你的用户身份运行 |
| **持久化** | 本地 JSON | 可手动编辑的文件保存你的备注 |
| **字体** | Inter + JetBrains Mono | 在信息密集的屏幕上可读性出色 |

### 仓库结构

```
claude-sessions-manager/
├── index.html       ← UI 和 SVG 图标
├── style.css        ← 设计系统 (暗色主题)
├── app.js           ← 渲染和 API 逻辑
├── app.wsgi         ← Python 后端
├── install.sh       ← 安装器
├── uninstall.sh     ← 卸载器
├── README.md        ← 你在这里
├── .gitignore       ← 忽略生成的数据
├── data/            ← (生成) 你的备注
└── cache/           ← (生成) 内部缓存
```

---

## 🔒 安全

- 后端以 **你的身份** 运行,而不是 `www-data` — 无需全局 `chmod` 即可读取你的会话。
- API 仅接受 UUID 格式的 ID (不存在路径遍历)。
- 前端永久删除需要二次确认。
- 默认仅在 **http://localhost** 提供服务 — **未经身份验证请勿暴露到互联网**。

---

## 🛠️ 开发

无需构建步骤。编辑并刷新页面即可。

```bash
# 修改后端后强制 mod_wsgi 重新加载
sudo touch /var/www/html/claude-sessions/app.wsgi

# 查看日志
sudo tail -f /var/log/apache2/error.log

# 清除内部缓存 (修改解析逻辑后)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 故障排查

<details>
<summary><strong>"加载会话失败"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

常见原因:
- `~/.claude/projects/` 尚不存在 — 请至少运行一次 Claude Code
- `mod_wsgi` 未启用: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>永久删除时 "Permission denied"</strong></summary>

后端需要以文件所有者身份运行。请检查:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
该行必须包含 `user=YOUR_USERNAME`。
</details>

<details>
<summary><strong>部分会话未显示</strong></summary>

仅列出主要 (可恢复) 会话。子代理的内部对话被有意忽略。
</details>

<details>
<summary><strong>修改了后端但 UI 没有更新</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
浏览器中:**Ctrl+Shift+R** 清除浏览器缓存。
</details>

---

## 🤝 贡献

欢迎 PR。提交前请注意:

- 保持 **零依赖** (无 `pip`,无 `npm`)
- 遵循 `style.css` 的设计系统 (语义化 CSS 变量)
- 新图标: 在 `index.html` 的 SVG 精灵图中添加 `<symbol>` (Lucide 风格,stroke 2,24×24)

---

## 📜 许可证

MIT — 随意使用。

---

<p align="center">
  用 <code>vim</code> 和咖啡制作。
</p>
