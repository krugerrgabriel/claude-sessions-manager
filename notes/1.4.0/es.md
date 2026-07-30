## 📋 Elige cómo copiar, y actualiza sin la terminal

El botón de copiar ya no da por hecho que quieres un comando de shell, y el
botón de actualizar ya no se limita a darte uno para pegar.

### Novedades

#### 📋 Selector de formato de copia

Un nuevo selector en la cabecera decide qué pone el botón de copiar en tu
portapapeles. Tres opciones, y la elección se guarda:

- **Comando de terminal** pone `claude --resume <id>`, para pegar en una shell
  con Claude Code cerrado.
- **Comando dentro de Claude** pone `/resume <id>`, para pegar en un Claude Code
  que ya está abierto.
- **Preguntar siempre** abre un selector en cada copia, mostrando el comando
  real de esa sesión.

Por defecto usa el comando de terminal, así que nada cambia hasta que tú lo
decidas.

#### ⚡ Actualización con un clic

El botón de actualizar ahora aplica la actualización en lugar de copiar un
comando. Haces clic, hace el pull, cambia los archivos y la página se recarga en
la versión nueva. Sin terminal, sin `sudo`.

Cuando una versión modifica el propio `install.sh`, la configuración de Apache
puede haber cambiado también, y eso requiere root. La actualización se detiene y
un modal explica lo ocurrido, con el comando listo para copiar. El mismo modal
aparece si tu clon tiene cambios sin confirmar, porque tus ediciones nunca se
descartan.

#### 🔒 Solo en localhost

**El panel era accesible desde tu red local sin ninguna autenticación.**
Cualquiera en el mismo Wi-Fi podía leer el nombre, la vista previa, la ruta y la
rama de todas tus sesiones, y borrar archivos de sesión. Ahora sirve solo en
localhost. **Ejecutar el instalador es lo que aplica esto.**

### 🐛 Correcciones

- **Mover una sesión entre proyectos podía perderla.** Claude Code convierte
  todo carácter no alfanumérico de la ruta en un guion, no solo los separadores,
  y el backend solo sustituía los separadores. Las sesiones movidas a un
  proyecto cuya ruta contiene `_`, `.`, un espacio o un acento quedaban
  imposibles de retomar.
- **Un `metadata.json` corrupto borraba en silencio todos los nombres, notas y
  favoritos.** La API ahora rechaza la escritura y lo dice, dejando el archivo
  intacto.
- **Un nombre de proyecto con caracteres de regex dejaba la pantalla en blanco.**
- **Las tarjetas saltaban al copiar**, porque el id de la sesión se ocultaba.

### ✨ Detalles

- **Desplegables propios** en lugar de los selects nativos de formato de copia,
  ordenación e idioma, con soporte completo de teclado y ancho constante.
- **`backdrop-filter` fuera.** Repintaba la cabecera fija en cada fotograma de
  scroll por un desenfoque que nadie pidió.
- **El id de la sesión se muestra completo**, en vez de 8 caracteres fijos.
- **Documentación al día en los 7 idiomas.**
