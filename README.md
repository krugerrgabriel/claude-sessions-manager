<h1 align="center">🔖 Claude Sessions</h1>

<p align="center">
  <strong>Um dashboard visual para gerenciar todas as suas sessões do <a href="https://claude.com/claude-code">Claude Code CLI</a>.</strong><br>
  Navegue, renomeie, favorite, descreva e retome qualquer sessão com um clique.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 Por que existe

Toda vez que você sai de uma sessão do Claude Code, ele imprime algo como:

```
> To resume this session later, run:
  claude --resume 3b3786b1-1cd5-4537-907d-74794e170b87
```

Depois de algumas semanas você tem **dezenas de UUIDs** espalhados em `~/.claude/projects/*` e nenhuma forma decente de saber:

- Qual sessão era qual?
- Qual estava perto de estourar a janela de contexto?
- Qual você queria retomar?

**Claude Sessions** resolve isso: lê os `.jsonl` direto do disco, agrupa por projeto, mostra o contexto em tokens, e te dá uma UI decente pra marcar as importantes.

---

## ✨ Funcionalidades

| | |
|---|---|
| 📋 **Copiar comando** | Clique em qualquer card → `claude --resume <uuid>` vai direto pro clipboard |
| 🏷️ **Nomes e descrições** | Renomeie sessões e anote o contexto pra não esquecer o que era cada UUID |
| ⭐ **Favoritos** | Destaque as sessões que você retoma com frequência |
| 🗑️ **Lixeira** | Soft-delete reversível; exclusão permanente só com confirmação dupla |
| 🔍 **Busca live** | Filtre por título, descrição, projeto, branch, ID, ou trecho da primeira mensagem |
| 📁 **Navegação por projeto** | Sidebar agrupa sessões por `cwd` com contador |
| 📊 **Meta rica** | Contexto em tokens (k/M), tamanho do `.jsonl`, branch, timestamp relativo, contagem de mensagens |
| 🌡️ **Alerta de contexto** | Pills de tokens ficam amarelas ≥ 180k e vermelhas ≥ 800k |
| ⌨️ **Atalhos** | `/` foca a busca · `Esc` fecha modal/limpa busca · `Enter` no card copia |
| 🌗 **Dark mode OLED** | Paleta `#0d0e12` com accent terracotta inspirado na Claude |
| ♿ **Acessível** | Focus rings visíveis, roles ARIA, suporte a `prefers-reduced-motion` |

---

## 📦 Instalação

### Pré-requisitos

- Ubuntu / Debian (ou qualquer distro com `apt`)
- `sudo`
- `~/.claude/projects/` com pelo menos uma sessão (ou vai funcionar vazio e encher com o uso)

### Em 3 comandos

```bash
git clone https://github.com/SEU_USUARIO/claude-sessions.git
cd claude-sessions
sudo ./install.sh
```

O instalador cuida de:

1. Instalar `apache2`, `libapache2-mod-wsgi-py3` e `python3` se faltarem
2. Habilitar o módulo `wsgi`
3. Copiar os arquivos para `/var/www/html/claude-sessions/`
4. Ajustar permissões (dono = você, grupo = `www-data` só nas pastas graváveis)
5. Gerar e habilitar o config do Apache
6. Recarregar o serviço e validar com smoke test

Ao fim, abra: **http://localhost/claude-sessions/**

### Customizar o caminho de instalação

```bash
sudo INSTALL_DIR=/opt/claude-sessions URL_PATH=/dashboard ./install.sh
```

### Usar outra pasta de sessões

```bash
sudo PROJECTS_DIR=/caminho/para/outro/.claude/projects ./install.sh
```

### Desinstalar

```bash
sudo ./uninstall.sh           # remove só o config do Apache, preserva metadata
sudo ./uninstall.sh --purge   # remove tudo, inclusive /var/www/html/claude-sessions
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (usuário)                        │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTTP/HTML                        │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (estático)   │          │  mod_wsgi → app.wsgi (py)  │
│   index.html           │          │  GET/PATCH/DELETE sessions │
│   style.css            │          │  cache + metadata          │
│   app.js               │          └──────────────┬─────────────┘
└────────────────────────┘                         │
                                                   │ lê/escreve
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/<uuid>.jsonl   (origem)       │
            │  data/metadata.json                  (persistência) │
            │  cache/sessions.json                 (cache mtime)  │
            └─────────────────────────────────────────────────────┘
```

### Stack

| Camada | Tech | Justificativa |
|---|---|---|
| **Frontend** | HTML + CSS + vanilla JS | Zero build step, zero framework, carrega em <100ms |
| **Backend** | Python 3 stdlib | Sem `pip install`, sem venv, só `import json` |
| **Integração** | mod_wsgi | Já vem enableado no Apache moderno, roda como o usuário dono do `.claude/` |
| **Persistência** | JSON flat file | Dados do usuário são seus: `data/metadata.json` legível, versionável, editável |
| **Fontes** | Inter + JetBrains Mono (Google Fonts) | Padrão de ferramenta dev, excelente legibilidade |

### Fluxo dos dados

1. `app.wsgi` varre `~/.claude/projects/*/*.jsonl` (ignora `subagents/`)
2. Para cada arquivo:
   - Lê primeiras 200 linhas → extrai `cwd`, `gitBranch`, primeira mensagem do user (sem ruído de `<command-*>`)
   - Lê ~64KB do fim → encontra o último `usage` do assistant → soma `input + cache_read + cache_creation` = tamanho do contexto
   - Cache indexado por `(path, mtime, size)` em `cache/sessions.json`
3. Frontend faz merge com `data/metadata.json` (nome custom, descrição, favorito, flag `deleted`)
4. UI renderiza agrupado por projeto; ações chamam `PATCH /api/sessions/<id>` ou `DELETE /api/sessions/<id>`

---

## ⌨️ Atalhos

| Tecla | Ação |
|---|---|
| `/` | Focar a busca |
| `Esc` | Fechar modal, ou limpar busca, ou fechar menu mobile |
| `Enter` / `Space` | Copiar comando do card focado |
| `Ctrl+Enter` | Salvar edição (no modal) |

---

## 🗂️ Estrutura do repositório

```
claude-sessions/
├── index.html       ← UI e sprite SVG de ícones
├── style.css        ← design system: dark mode OLED + terracotta
├── app.js           ← lógica de render, eventos, API
├── app.wsgi         ← backend Python (pure stdlib)
├── install.sh       ← instalador (apt + Apache + permissões)
├── uninstall.sh     ← desinstalador
├── README.md        ← você está aqui
├── .gitignore       ← ignora data/ e cache/ (runtime)
├── data/            ← (gerado) metadata.json — suas anotações
└── cache/           ← (gerado) sessions.json — cache por mtime
```

---

## 🔒 Segurança & permissões

- O WSGI roda **como o usuário local** (`user=SEU_USER` no `WSGIDaemonProcess`), não como `www-data`.  
  Isso garante acesso de leitura/escrita em `~/.claude/projects/` sem chmod global.
- Pastas `data/` e `cache/` têm grupo `www-data` + `chmod 775` só pra redundância (nem usado, já que o process é do user).
- A API só aceita IDs em regex `[0-9a-fA-F-]{36}` — sem path traversal.
- Delete permanente só via `DELETE /api/sessions/<id>`, com **dupla confirmação** no frontend.
- Default serve em `http://localhost` — **não exponha externo** sem autenticação.

---

## 🛠️ Desenvolvimento local

O projeto não tem build step — edite os arquivos em `/var/www/html/claude-sessions/` e recarregue a página.

Para mudanças no `app.wsgi`, force o mod_wsgi a recarregar:

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
```

Ver logs:

```bash
sudo tail -f /var/log/apache2/error.log
```

Resetar cache (após mudar parsing):

```bash
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 Troubleshooting

<details>
<summary><strong>"Falha ao carregar sessões"</strong></summary>

Cheque o log do Apache:
```bash
sudo tail -20 /var/log/apache2/error.log
```
Causas comuns:
- `~/.claude/projects/` não existe — use o Claude Code pelo menos uma vez
- `mod_wsgi` não está habilitado: `sudo a2enmod wsgi && sudo systemctl reload apache2`
- Permissão: o WSGI precisa ler `~/.claude/projects/`. O instalador configura isso.
</details>

<details>
<summary><strong>"Permission denied" ao excluir permanentemente</strong></summary>

O WSGI precisa rodar como o dono dos `.jsonl`. Confira se o config tem `user=SEU_USUARIO` na linha `WSGIDaemonProcess`:
```bash
cat /etc/apache2/conf-available/claude-sessions.conf
```
</details>

<details>
<summary><strong>Sessões não aparecem ou ficam faltando algumas</strong></summary>

Só arquivos `.jsonl` no **nível de topo** de cada projeto são considerados. Arquivos em `subagents/` são ignorados por serem sessões internas não retomáveis.
</details>

<details>
<summary><strong>Mudei o backend mas a UI não atualiza</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
E no browser: **Ctrl+Shift+R** pra limpar cache do JS/CSS.
</details>

---

## 🤝 Contribuindo

PRs bem-vindos. Antes de mandar:

- Mantenha **zero dependências** (sem `pip`, sem `npm`)
- Siga o design system em `style.css` (variáveis CSS `--accent`, `--surface`, etc.)
- Ícones: adicione novos `<symbol>` no sprite SVG do `index.html` (estilo Lucide, stroke 2, 24×24)

---

## 📜 Licença

MIT — faça o que quiser.

---

<p align="center">
  Construído com <code>vim</code> e café.
</p>
