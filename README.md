<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong>Seu ponto de partida diário para o <a href="https://claude.com/claude-code">Claude Code</a>.</strong><br>
  Retome qualquer conversa de onde parou — sem re-explicar o projeto, sem perder contexto.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 Por que usar

Todo projeto tem um custo oculto: **reaquecer o contexto**. Toda vez que você abre o Claude, perde tempo:

- 🔁 Re-explicando a arquitetura
- 📍 Apontando onde parou
- 📂 Indicando os arquivos importantes
- 🧠 Realinhando o que estava em andamento

São **15–30 minutos só pra começar a produzir**. E quando o terminal fecha, o contexto que o Claude acabou de montar vai embora.

✨ **A boa notícia:** o Claude Code já salva cada conversa pra você retomar.  
😩 **O problema:** achar a conversa certa no meio de dezenas de códigos automáticos.

É isso que este projeto resolve. Em 4 passos:

1. 🏁 Abre a dashboard
2. 🎯 Acha a conversa certa
3. 📋 Clica — o comando já está no clipboard
4. 💻 Cola no terminal e continua de onde parou

> **Retomar custa segundos. Recomeçar custa horas.**

---

## ✨ Funcionalidades

| | |
|---|---|
| 🔁 **Retomar com 1 clique** | Clique numa conversa → o comando de retomar fica no clipboard na hora |
| 🏷️ **Nomes e anotações** | Dê um nome humano pra cada conversa e anote em que ponto você parou |
| ⭐ **Favoritos** | Destaque as conversas que você usa todo dia |
| 🗑️ **Lixeira segura** | Arquive antigas sem medo — exclusão definitiva só com confirmação dupla |
| 🔍 **Busca instantânea** | Filtra por nome, anotação, projeto, branch ou pelo que foi dito na conversa |
| 📁 **Agrupamento por projeto** | Conversas organizadas pelo projeto em que estavam, com contador na lateral |
| 📊 **Informações úteis** | Quanto contexto consumiu, tamanho, branch, última atividade — tudo visível no card |
| 🌡️ **Aviso de saturação** | Conversas perto de estourar o contexto aparecem destacadas em amarelo e vermelho |
| ⌨️ **Atalhos de teclado** | `/` busca, `Esc` fecha, `Enter` retoma — sem tirar a mão do teclado |
| 🌗 **Tema escuro suave** | Visual pensado pra horas de tela, com acento terracotta inspirado na Claude |
| ♿ **Acessível** | Navegação por teclado, contraste adequado, respeita "reduzir movimento" do sistema |

---

## 📦 Instalação

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ Rode o instalador

```bash
sudo ./install.sh
```

O instalador cuida de tudo sozinho — instala o que falta, copia os arquivos, ajusta as permissões e configura o servidor web. Termina em segundos.

### 3️⃣ Abra no navegador

Duas formas, escolha a que preferir:

🖥️ **Direto no endereço:** http://localhost/claude-sessions/

⌨️ **Ou pelo terminal:**

```bash
claude-sessions
```

ou

```bash
claude-sessions-manager
```

O instalador cria esse comando automaticamente — ele abre o dashboard no seu navegador padrão.

Pronto. 🎉

> 💡 **Pré-requisito único:** qualquer Linux com `apt` (Ubuntu, Debian, Mint, Pop!_OS, etc.) e `sudo`.

---

## ⚙️ Configurações avançadas

Use só se precisar — tudo funciona de fábrica.

<details>
<summary><strong>Instalar em outro caminho ou URL</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
Depois acesse em **http://localhost/dashboard/**.
</details>

<details>
<summary><strong>Usar outra pasta de sessões</strong></summary>

```bash
sudo PROJECTS_DIR=/caminho/alternativo/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>Desinstalar</strong></summary>

```bash
sudo ./uninstall.sh           # preserva suas anotações (nomes, favoritos, descrições)
sudo ./uninstall.sh --purge   # remove tudo, inclusive as anotações
```
</details>

---

## ⌨️ Atalhos

| Tecla | Ação |
|---|---|
| `/` | Focar a busca |
| `Esc` | Fechar modal, limpar busca ou fechar menu mobile |
| `Enter` / `Space` | Retomar a conversa em foco |
| `Ctrl+Enter` | Salvar edição (no modal) |

---

## 🏗️ Como funciona por dentro

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (você)                           │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (estático)   │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ lê/escreve
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (suas sessões)     │
            │  data/metadata.json              (suas anotações)    │
            │  cache/sessions.json             (cache interno)     │
            └─────────────────────────────────────────────────────┘
```

### Stack

| Camada | Tech | Por que |
|---|---|---|
| **Frontend** | HTML + CSS + vanilla JS | Zero build step, carrega em <100ms |
| **Backend** | Python 3 (stdlib) | Sem `pip install`, sem `venv` |
| **Integração** | mod_wsgi | Já vem no Apache moderno; roda como o seu usuário |
| **Persistência** | JSON local | Suas anotações num arquivo editável à mão |
| **Fontes** | Inter + JetBrains Mono | Boa legibilidade em telas densas |

### Estrutura do repositório

```
claude-sessions-manager/
├── index.html       ← UI e ícones SVG
├── style.css        ← design system (tema escuro)
├── app.js           ← lógica de render e API
├── app.wsgi         ← backend Python
├── install.sh       ← instalador
├── uninstall.sh     ← desinstalador
├── README.md        ← você está aqui
├── .gitignore       ← ignora dados gerados
├── data/            ← (gerado) suas anotações
└── cache/           ← (gerado) cache interno
```

---

## 🔒 Segurança

- O backend roda **como você**, não como `www-data` — lê suas sessões sem `chmod` global.
- A API só aceita IDs em formato UUID (sem path traversal).
- Exclusão permanente exige confirmação dupla no frontend.
- Serve só em **http://localhost** por padrão — **não exponha pra internet** sem autenticação.

---

## 🛠️ Desenvolvendo

Sem build step. Edite e recarregue a página.

```bash
# Forçar mod_wsgi a recarregar após mudar o backend
sudo touch /var/www/html/claude-sessions/app.wsgi

# Ver logs
sudo tail -f /var/log/apache2/error.log

# Limpar cache interno (após mudar parsing)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 Troubleshooting

<details>
<summary><strong>"Falha ao carregar sessões"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

Causas comuns:
- `~/.claude/projects/` ainda não existe — use o Claude Code pelo menos uma vez
- `mod_wsgi` não habilitado: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>"Permission denied" ao excluir permanentemente</strong></summary>

O backend precisa rodar como o dono dos arquivos. Confira:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
A linha deve ter `user=SEU_USUARIO`.
</details>

<details>
<summary><strong>Algumas sessões não aparecem</strong></summary>

Só sessões principais (retomáveis) são listadas. Conversas internas de sub-agentes são ignoradas de propósito.
</details>

<details>
<summary><strong>Mudei o backend mas a UI não atualiza</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
No browser: **Ctrl+Shift+R** pra limpar cache do navegador.
</details>

---

## 🤝 Contribuindo

PRs bem-vindos. Antes de mandar:

- Mantenha **zero dependências** (sem `pip`, sem `npm`)
- Siga o design system em `style.css` (variáveis CSS semânticas)
- Novos ícones: adicione `<symbol>` no sprite SVG do `index.html` (estilo Lucide, stroke 2, 24×24)

---

## 📜 Licença

MIT — faça o que quiser.

---

<p align="center">
  Feito com <code>vim</code> e café.
</p>
