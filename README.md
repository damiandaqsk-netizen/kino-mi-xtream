# Mi Xtream — plugin de Kino

Tu TV en vivo, tus **películas** y tus **series** de tu servidor Xtream dentro de Kino:
los canales en la pestaña **En vivo**, y el catálogo en el Inicio, las categorías y la
búsqueda de la app, con los capítulos de cada serie ordenados por temporada.

**Versión 1.2.3** — a pedido de Damian, la sección queda solo con Películas y Series (fuera la pestaña En vivo de la sección, que salía vacía; los canales siguen en la pestaña En vivo de Kino). La 1.2.2 — la pestaña En vivo de la sección salía vacía en el TV (Películas y Series sí cargaban): los logos de canales Xtream suelen venir con espacios sin codificar y una imagen inválida hace que Kino descarte el ítem en silencio; ahora toda URL de imagen se sanea con encodeURI y el ref de los canales en filas usa el formato oficial "live:<id>". La 1.2.1 dejó la sección liviana y en paralelo (la 1.2.0 pedía hasta 10 categorías en fila y no entraba en los 20 s de la sección). La 1.2.0 sumó la **sección propia "Mi Xtream"** (entrada en la barra lateral /
"Más secciones" del TV, con pestañas Películas · Series · En vivo) y mosaicos en la
pestaña **Categorías** de Kino. La 1.1.0 agregó películas (VOD) y series con capítulos
a la 1.0.0 (solo TV en vivo).

## Por qué este plugin existe

La sección nativa "Mis canales" de Kino baja la lista completa de una vez y la corta
por tiempo/tamaño ("tu servidor no está disponible"). Este plugin, en cambio, pide
primero **las categorías** (una respuesta pequeña) y luego el contenido **por categoría
y por páginas** (canales de 200 en 200; películas y series de 60 en 60; los capítulos,
al abrir cada serie). Ninguna petición es grande: todo entra en los límites de Kino
(15–30 s por petición, 5 MB máximo).

## Versión 1.3.3 — dirección con puerto

La dirección fija del servidor queda exactamente `http://tvgopremium.net:80` (con el puerto 80, sin espacios), como lo pide Damian.

## Versión 1.3.2 — servidor fijo

El servidor Xtream (http://tvgopremium.net:80) queda fijo dentro del plugin: en Configurar ya solo se escriben **usuario y contraseña**. El manifiesto declara `hosts: ["tvgopremium.net"]` (requisito del validador al ya no existir un ajuste tipo url). Si el proveedor cambia de dominio, hay que actualizar el plugin.

## Versión 1.3.1 — limpieza

Se retira la integración con Addon Latam agregada en la 1.3.0. En Kino, Addon Latam viene predefinido y su clave de acceso está sellada dentro de su propio plugin, así que no existe ningún enlace personal que configurar y ningún otro plugin puede usar esa clave. Latam sigue disponible en Kino como su propia sección.

Sin cambios funcionales respecto de la 1.2.3: sección con Películas y Series, canales en vivo por categorías en la pestaña En vivo de Kino, buscador y capítulos.

## Archivos

- `kino-plugin.json` — el manifiesto (id `mi-xtream`, versión `1.2.0`, apiVersion 6).
- `plugin.js` — el código.

Tu **contraseña no va en estos archivos**: se escribe en el TV, en la pantalla
*Configurar* del plugin, y queda cifrada en tu aparato (Kino no la registra ni la
envía a ningún lado salvo a tu servidor Xtream).

## Cómo publicarlo

1. Crea un repositorio **público** en GitHub (p. ej. `tu-usuario/kino-mi-xtream`).
2. Sube `kino-plugin.json` y `plugin.js` (estos dos archivos, nada más).
3. Agrega el topic **`kino-plugin`** al repositorio (en GitHub: repo → ⚙️
   (engranaje) → Topics). Sin ese topic Kino no lo encuentra en búsquedas, pero
   la instalación escribiendo la dirección funciona igual.

## Cómo instalarlo en Kino

1. En Kino: **Ajustes ▸ Plugins**.
2. Escribe `tu-usuario/kino-mi-xtream` (tu GitHub y el nombre del repo).
3. Lee la hoja de consentimiento y acepta. Verás:
   - "Este plugin usa tu usuario y contraseña"
   - "Se conectará a los servidores que escribas en su configuración"
   - "Agrega canales en vivo a la pestaña En vivo"
   - (en rojo) "Puede reproducir canales desde cualquier servidor que indique su lista" — es necesario porque los videos de IPTV viven en varios servidores del proveedor.
4. Entra a **Configurar** del plugin y llena:
   - Servidor Xtream: `http://tvgopremium.net`
   - Usuario: `Polo2026`
   - Contraseña: tu clave
5. Tus categorías aparecen en la pestaña **En vivo**, en una sección llamada "Mi Xtream".

## Requisitos

Kino 0.9.51 o más nuevo (usa apiVersion 3).

## Nota técnica

Reproduce cada cosa por su ruta Xtream: TV en vivo por HLS
(`/live/<usuario>/<clave>/<id>.m3u8`), películas por `/movie/<usuario>/<clave>/<id>.<ext>`
y capítulos por `/series/<usuario>/<clave>/<id>.<ext>`, usando la extensión
(contenedor) que reporta el propio servidor. Si algo no abre con esa forma, avísame
y ajusto la URL de reproducción.
