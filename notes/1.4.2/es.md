## 🔄 Una actualización que se ve actualizada

La versión anterior impidió que el panel volviera con archivos viejos después
de pulsar actualizar. Esta cierra el otro camino, y le da a una instalación
nueva sus propias notas.

### 🐛 Correcciones

- **El panel todavía podía arrancar con la hoja de estilos de la versión
  anterior.** Pulsar actualizar recarga la página, y con eso bastaba.
  Actualizar desde un terminal y luego simplemente volver a la pestaña no
  bastaba: nada revalidaba y el navegador servía lo que ya tenía, que es como
  una versión nueva aparece sin estilos. Apache ahora marca `index.html` y los
  diccionarios de idioma como necesitados de revalidación, y la hoja de estilos
  y el script llevan la versión en su dirección, así que una actualización
  nunca queda mitad vieja y mitad nueva.

### ✨ Detalles

- **Una instalación nueva incluye las notas de versión.** El botón de novedades
  las lee del disco, en el idioma que elegiste, en lugar de recurrir al inglés
  desde GitHub.
- **El instalador habilita `mod_headers`**, y la configuración sigue
  funcionando sin él, solo que sin revalidación.
