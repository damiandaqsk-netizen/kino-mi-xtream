# Mi Xtream — plugin de Kino

Tus canales en vivo de tu servidor Xtream dentro de la pestaña **En vivo** de Kino.

## Por qué este plugin existe

La sección nativa "Mis canales" de Kino baja la lista completa de una vez y la corta
por tiempo/tamaño ("tu servidor no está disponible"). Este plugin, en cambio, pide
primero **las categorías** (una respuesta pequeña) y luego los canales **de la categoría
que abras, por páginas de 200**. Ninguna petición es grande: todo entra en los límites
de Kino (15–30 s por petición, 5 MB máximo).

## Archivos

- `kino-plugin.json` — el manifiesto (id `mi-xtream`, versión `1.0.0`, apiVersion 3).
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

Reproduce por HLS: `/live/<usuario>/<clave>/<id>.m3u8`. Si algún canal no abre con
esa forma, avísame y ajusto la URL de reproducción.
