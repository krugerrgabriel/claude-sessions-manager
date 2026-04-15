<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong>Tu punto de partida diario para <a href="https://claude.com/claude-code">Claude Code</a>.</strong><br>
  Retoma cualquier conversación justo donde la dejaste — sin volver a explicar el proyecto, sin perder el contexto.
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <strong>🇪🇸 Español</strong> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> ·
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

## 💡 Por qué usarlo

Cada proyecto tiene un costo oculto: **recalentar el contexto**. Cada vez que abres Claude, pierdes tiempo:

- 🔁 Volviendo a explicar la arquitectura
- 📍 Indicando dónde lo dejaste
- 📂 Señalando los archivos importantes
- 🧠 Reajustando lo que estaba en marcha

Son **15–30 minutos solo para empezar a producir**. Y cuando cierras el terminal, el contexto que Claude acaba de construir se va con él.

✨ **La buena noticia:** Claude Code ya guarda cada conversación para que puedas retomarla.

😩 **El problema:** encontrar la conversación correcta entre decenas de códigos generados automáticamente.

Eso es lo que resuelve este proyecto. En 4 pasos:

1. 🏁 Abres el panel
2. 🎯 Encuentras la conversación correcta
3. 📋 Haces clic — el comando ya está en el portapapeles
4. 💻 Lo pegas en el terminal y sigues donde lo dejaste

> **Retomar cuesta segundos. Volver a empezar cuesta horas.**

---

## ✨ Características

| | |
|---|---|
| 🔁 **Retomar con 1 clic** | Haz clic en una conversación → el comando para retomar queda en el portapapeles al instante |
| 🏷️ **Nombres y notas** | Dale un nombre humano a cada conversación y anota dónde la dejaste |
| ⭐ **Favoritas** | Destaca las conversaciones que usas a diario |
| 🗑️ **Papelera segura** | Archiva las antiguas sin miedo — la eliminación definitiva exige doble confirmación |
| 🔍 **Búsqueda instantánea** | Filtra por nombre, notas, proyecto, rama o por lo que se dijo en la conversación |
| 📁 **Agrupación por proyecto** | Conversaciones organizadas por el proyecto al que pertenecen, con contador en la barra lateral |
| 📊 **Información útil** | Contexto consumido, tamaño, rama, última actividad — todo visible en la tarjeta |
| 🌡️ **Aviso de saturación** | Las conversaciones cerca de llenar la ventana de contexto se destacan en amarillo y rojo |
| ⌨️ **Atajos de teclado** | `/` buscar, `Esc` cerrar, `Enter` retomar — sin levantar las manos del teclado |
| 🌗 **Tema oscuro suave** | Diseño pensado para horas frente a la pantalla, con acento terracota inspirado en Claude |
| ♿ **Accesible** | Navegación por teclado, contraste adecuado, respeta "reducir movimiento" del sistema |

---

## 📦 Instalación

### 1️⃣ Clona el repositorio

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ Ejecuta el instalador

```bash
sudo ./install.sh
```

El instalador se encarga de todo — instala lo que falta, copia los archivos, ajusta los permisos y configura el servidor web. Termina en segundos.

### 3️⃣ Ábrelo en el navegador

Dos formas, la que prefieras:

🖥️ **Directamente por URL:** http://localhost/claude-sessions/

⌨️ **O desde el terminal:**

```bash
claude-sessions
```

o

```bash
claude-sessions-manager
```

El instalador crea ese comando automáticamente — abre el panel en tu navegador predeterminado.

Listo. 🎉

> 💡 **Único requisito:** cualquier Linux con `apt` (Ubuntu, Debian, Mint, Pop!_OS, etc.) y `sudo`.

---

## ⚙️ Configuración avanzada

Úsalas solo si las necesitas — todo funciona de fábrica.

<details>
<summary><strong>Instalar en otra ruta o URL</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
Luego abre **http://localhost/dashboard/**.
</details>

<details>
<summary><strong>Usar otra carpeta de sesiones</strong></summary>

```bash
sudo PROJECTS_DIR=/ruta/alternativa/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>Desinstalar</strong></summary>

```bash
sudo ./uninstall.sh           # conserva tus notas (nombres, favoritas, descripciones)
sudo ./uninstall.sh --purge   # lo elimina todo, incluidas tus notas
```
</details>

---

## ⌨️ Atajos

| Tecla | Acción |
|---|---|
| `/` | Enfocar el buscador |
| `Esc` | Cerrar modal, limpiar búsqueda o cerrar menú móvil |
| `Enter` / `Space` | Retomar la conversación enfocada |
| `Ctrl+Enter` | Guardar cambios (dentro del modal) |

---

## 🏗️ Cómo funciona por dentro

```
┌─────────────────────────────────────────────────────────────────┐
│                        Navegador (tú)                           │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (estático)   │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ lee/escribe
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (tus sesiones)     │
            │  data/metadata.json              (tus notas)        │
            │  cache/sessions.json             (caché interna)    │
            └─────────────────────────────────────────────────────┘
```

### Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| **Frontend** | HTML + CSS + JS vanilla | Sin build step, carga en <100 ms |
| **Backend** | Python 3 (stdlib) | Sin `pip install`, sin `venv` |
| **Integración** | mod_wsgi | Viene con Apache moderno; corre como tu usuario |
| **Persistencia** | JSON local | Tus notas en un archivo editable a mano |
| **Fuentes** | Inter + JetBrains Mono | Excelente legibilidad en pantallas densas |

### Estructura del repositorio

```
claude-sessions-manager/
├── index.html       ← UI e íconos SVG
├── style.css        ← design system (tema oscuro)
├── app.js           ← lógica de render y API
├── app.wsgi         ← backend Python
├── install.sh       ← instalador
├── uninstall.sh     ← desinstalador
├── README.md        ← estás aquí
├── .gitignore       ← ignora datos generados
├── data/            ← (generado) tus notas
└── cache/           ← (generado) caché interna
```

---

## 🔒 Seguridad

- El backend corre **como tú**, no como `www-data` — lee tus sesiones sin un `chmod` global.
- La API solo acepta IDs en formato UUID (sin path traversal).
- La eliminación permanente exige doble confirmación en el frontend.
- Sirve solo en **http://localhost** por defecto — **no lo expongas a internet** sin autenticación.

---

## 🛠️ Desarrollo

Sin build step. Edita y recarga la página.

```bash
# Forzar a mod_wsgi a recargar tras cambiar el backend
sudo touch /var/www/html/claude-sessions/app.wsgi

# Ver logs
sudo tail -f /var/log/apache2/error.log

# Limpiar caché interna (tras cambiar el parsing)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 Solución de problemas

<details>
<summary><strong>"Error al cargar sesiones"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

Causas comunes:
- `~/.claude/projects/` aún no existe — usa Claude Code al menos una vez
- `mod_wsgi` no está activo: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>"Permission denied" al eliminar permanentemente</strong></summary>

El backend necesita correr como el dueño de los archivos. Comprueba:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
La línea debe incluir `user=TU_USUARIO`.
</details>

<details>
<summary><strong>Algunas sesiones no aparecen</strong></summary>

Solo se listan sesiones principales (reanudables). Las conversaciones internas de sub-agentes se ignoran a propósito.
</details>

<details>
<summary><strong>Cambié el backend pero la UI no se actualiza</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
En el navegador: **Ctrl+Shift+R** para limpiar la caché del navegador.
</details>

---

## 🤝 Contribuir

PRs bienvenidos. Antes de enviar:

- Mantén **cero dependencias** (sin `pip`, sin `npm`)
- Sigue el design system de `style.css` (variables CSS semánticas)
- Íconos nuevos: añade un `<symbol>` al sprite SVG en `index.html` (estilo Lucide, stroke 2, 24×24)

---

## 📜 Licencia

MIT — haz lo que quieras.

---

<p align="center">
  Hecho con <code>vim</code> y café.
</p>
