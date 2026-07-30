## ✨ Qué cambió, sin salir del panel

Hasta ahora, las notas de cada versión solo se podían leer en GitHub. Ya están
en la barra lateral, en tu idioma.

### Novedades

#### 📖 Botón de novedades

Un botón al pie de la barra lateral abre las notas de la versión que tienes
instalada. El texto viaja con la aplicación, un archivo por idioma, así que
llega en el idioma que elegiste y funciona sin conexión alguna.

El botón se anuncia la primera vez que abres el panel después de actualizar, se
vuelve más discreto en la siguiente recarga y regresa a la normalidad en cuanto
lo lees.

### 🐛 Correcciones

- **Actualizar podía dejar el panel sin estilos.** El navegador seguía usando el
  CSS de la versión anterior, y solo una recarga forzada traía el nuevo. La
  actualización ahora sella la hoja de estilos y el script con el número de
  versión, una dirección que ninguna caché ha visto jamás.

### ✨ Detalles

- **La actualización pide el terminal con menos frecuencia.** Antes se detenía
  ante cualquier cambio en `install.sh`, incluidos los que solo copian archivos.
  Ahora se detiene únicamente cuando cambió la configuración de Apache, que es
  la parte que de verdad necesita root.
- **Las notas de versión viajan con la actualización**, así que las notas de la
  próxima versión ya están en disco cuando vayas a leerlas.
