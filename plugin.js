/// <reference path="./kino.d.ts" />

// Mi Xtream — plugin de Kino.
// TV en vivo (capacidad "channels") + películas y series (catálogo) desde
// TU servidor Xtream. Todo se pide por categorías y paginado, nunca la
// lista entera de una vez (ese es el paso que Kino corta por tamaño/tiempo
// en la sección nativa "Mis canales").
// El servidor, el usuario y la clave se escriben en la pantalla Configurar
// del plugin dentro de Kino: nunca viajan a nadie, quedan en tu aparato.
//
// API Xtream (XUI / Xtream Codes) que se usa:
//   player_api.php?...&action=get_live_categories | get_live_streams&category_id=
//   player_api.php?...&action=get_vod_categories  | get_vod_streams&category_id=
//   player_api.php?...&action=get_series_categories | get_series&category_id=
//   player_api.php?...&action=get_series_info&series_id=
// Reproducción: /live/U/P/<id>.m3u8 · /movie/U/P/<id>.<ext> · /series/U/P/<id>.<ext>

const LIVE_PAGE = 200;   // canales por página dentro de una categoría
const BROWSE_PAGE = 60;  // títulos por página en películas/series
const SEARCH_MAX = 60;   // resultados máximos de una búsqueda
const SEARCH_MAX_FETCHES = 30;

function baseUrl() {
  const s = (kino.config.get("servidor") || "").trim().replace(/\/+$/, "");
  const u = (kino.config.get("usuario") || "").trim();
  const p = (kino.config.get("clave") || "").trim();
  if (!s || !u || !p) {
    throw kino.error("auth_required", "Configura tu servidor, usuario y contraseña en Ajustes ▸ Plugins ▸ Mi Xtream ▸ Configurar");
  }
  return { s, u, p };
}

async function xtream(action) {
  const { s, u, p } = baseUrl();
  const url = `${s}/player_api.php?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&action=${action}`;
  let r;
  try {
    r = await kino.fetch(url);
  } catch (e) {
    throw kino.error("unavailable", "No se pudo contactar el servidor Xtream");
  }
  // XUI responde 200 con el JSON también cuando la clave está mal ("user_info": { "auth": 0 });
  // los paneles Xtream-Masters además devuelven 401 con INVALID_AUTH para credenciales inválidas.
  if (r.status === 401) {
    throw kino.error("auth_required", "Usuario o contraseña incorrectos");
  }
  if (!r.ok) {
    throw kino.error("unavailable", "El servidor respondió " + r.status);
  }
  let data;
  try {
    data = JSON.parse(r.text());
  } catch (e) {
    throw kino.error("unavailable", "El servidor no devolvió una respuesta Xtream válida");
  }
  if (data && !Array.isArray(data) && data.user_info && String(data.user_info.auth) === "0") {
    throw kino.error("auth_required", "Usuario o contraseña incorrectos");
  }
  return data;
}

function yearOf(dateStr, added) {
  if (dateStr && /^\d{4}/.test(String(dateStr))) return String(dateStr).slice(0, 4);
  const a = parseInt(added, 10);
  if (a > 1000000000) return String(new Date(a * 1000).getUTCFullYear());
  return undefined;
}

function ratingOf(v) {
  const n = parseFloat(v);
  return isNaN(n) || n <= 0 ? undefined : Math.round(n * 10) / 10;
}

/* ================= TV en vivo (pestaña En vivo) ================= */

export async function liveCategories() {
  const data = await xtream("get_live_categories");
  if (!Array.isArray(data)) return [];
  return data
    .filter((c) => c && c.category_id)
    .map((c) => ({ id: String(c.category_id), title: c.category_name || String(c.category_id) }));
}

export async function liveChannels({ categoryId, cursor }) {
  const data = await xtream("get_live_streams&category_id=" + encodeURIComponent(categoryId));
  const all = Array.isArray(data) ? data : [];
  const offset = cursor ? parseInt(cursor, 10) || 0 : 0;
  const items = all.slice(offset, offset + LIVE_PAGE).map((s) => ({
    id: "ch" + s.stream_id,
    title: s.name || ("Canal " + s.stream_id),
    categoryId: String(categoryId),
    ref: String(s.stream_id),
    logo: s.stream_icon ? String(s.stream_icon) : undefined,
  }));
  return { items, next: offset + LIVE_PAGE < all.length ? String(offset + LIVE_PAGE) : undefined };
}

/* ================= Películas y series (catálogo) ================= */

function movieItem(s) {
  const ext = s.container_extension || "mp4";
  return {
    id: "m" + s.stream_id,
    ref: "m:" + s.stream_id + ":" + ext,
    title: s.name || ("Película " + s.stream_id),
    kind: "movie",
    poster: s.stream_icon ? String(s.stream_icon) : undefined,
    year: yearOf(s.releaseDate || s.releasedate, s.added),
    rating: ratingOf(s.rating),
  };
}

function seriesItem(s) {
  return {
    id: "s" + s.series_id,
    ref: "s:" + s.series_id,
    title: s.name || ("Serie " + s.series_id),
    kind: "series",
    poster: s.cover ? String(s.cover) : undefined,
    overview: s.plot ? String(s.plot) : undefined,
    year: yearOf(s.releaseDate || s.release_date, s.last_modified),
    rating: ratingOf(s.rating),
    genres: s.genre ? String(s.genre).split(",").map((g) => g.trim()).filter(Boolean) : undefined,
  };
}

async function categoriesOf(action) {
  const data = await xtream(action);
  if (!Array.isArray(data)) return [];
  return data
    .filter((c) => c && c.category_id)
    .map((c) => ({ id: String(c.category_id), title: c.category_name || String(c.category_id) }));
}

// Filas de Inicio: hasta 6 categorías de películas y 6 de series, con una
// muestra de títulos cada una. El resto se explora con "Ver más" (browse)
// o con la búsqueda.
export async function home() {
  const rows = [];
  const vodCats = await categoriesOf("get_vod_categories");
  for (const c of vodCats.slice(0, 6)) {
    try {
      const data = await xtream("get_vod_streams&category_id=" + encodeURIComponent(c.id));
      const items = (Array.isArray(data) ? data : []).slice(0, 12).map(movieItem);
      if (items.length) rows.push({ id: "vodrow-" + c.id, title: "Películas · " + c.title, ref: "vod:" + c.id, genre: "peliculas", items });
    } catch (e) { /* una categoría caída no tumba el Inicio */ }
  }
  const serCats = await categoriesOf("get_series_categories");
  for (const c of serCats.slice(0, 6)) {
    try {
      const data = await xtream("get_series&category_id=" + encodeURIComponent(c.id));
      const items = (Array.isArray(data) ? data : []).slice(0, 12).map(seriesItem);
      if (items.length) rows.push({ id: "serrow-" + c.id, title: "Series · " + c.title, ref: "ser:" + c.id, genre: "series", items });
    } catch (e) { /* igual */ }
  }
  return rows;
}

export async function browse(ref, cursor) {
  const offset = cursor ? parseInt(cursor, 10) || 0 : 0;
  if (ref.startsWith("vod:")) {
    const data = await xtream("get_vod_streams&category_id=" + encodeURIComponent(ref.slice(4)));
    const all = Array.isArray(data) ? data : [];
    return {
      items: all.slice(offset, offset + BROWSE_PAGE).map(movieItem),
      next: offset + BROWSE_PAGE < all.length ? String(offset + BROWSE_PAGE) : undefined,
    };
  }
  if (ref.startsWith("ser:")) {
    const data = await xtream("get_series&category_id=" + encodeURIComponent(ref.slice(4)));
    const all = Array.isArray(data) ? data : [];
    return {
      items: all.slice(offset, offset + BROWSE_PAGE).map(seriesItem),
      next: offset + BROWSE_PAGE < all.length ? String(offset + BROWSE_PAGE) : undefined,
    };
  }
  return { items: [] };
}

export async function search(query) {
  const q = ((query && query.q) || "").trim().toLowerCase();
  if (!q) return [];
  const terms = [q];
  if (query.originalTitle) terms.push(String(query.originalTitle).toLowerCase());
  if (Array.isArray(query.altTitles)) for (const t of query.altTitles) terms.push(String(t).toLowerCase());
  const hits = (name) => {
    const n = String(name || "").toLowerCase();
    return terms.some((t) => t && n.includes(t));
  };
  const out = [];
  let fetches = 0;
  const vodCats = await categoriesOf("get_vod_categories");
  for (const c of vodCats) {
    if (out.length >= SEARCH_MAX || fetches >= SEARCH_MAX_FETCHES) break;
    fetches++;
    try {
      const data = await xtream("get_vod_streams&category_id=" + encodeURIComponent(c.id));
      for (const s of Array.isArray(data) ? data : []) {
        if (hits(s.name)) out.push(movieItem(s));
        if (out.length >= SEARCH_MAX) break;
      }
    } catch (e) { /* salta la categoría */ }
  }
  const serCats = await categoriesOf("get_series_categories");
  for (const c of serCats) {
    if (out.length >= SEARCH_MAX || fetches >= SEARCH_MAX_FETCHES) break;
    fetches++;
    try {
      const data = await xtream("get_series&category_id=" + encodeURIComponent(c.id));
      for (const s of Array.isArray(data) ? data : []) {
        if (hits(s.name)) out.push(seriesItem(s));
        if (out.length >= SEARCH_MAX) break;
      }
    } catch (e) { /* salta la categoría */ }
  }
  return out;
}

export async function episodes(ref) {
  const seriesId = String(ref).replace(/^s:/, "");
  const data = await xtream("get_series_info&series_id=" + encodeURIComponent(seriesId));
  const info = (data && data.info) || {};
  const series = {
    title: info.name || undefined,
    poster: info.cover ? String(info.cover) : undefined,
    overview: info.plot ? String(info.plot) : undefined,
    year: yearOf(info.releaseDate || info.release_date, null),
    rating: ratingOf(info.rating),
    genres: info.genre ? String(info.genre).split(",").map((g) => g.trim()).filter(Boolean) : undefined,
  };
  const eps = [];
  const bySeason = (data && data.episodes) || {};
  for (const seasonKey of Object.keys(bySeason)) {
    for (const ep of bySeason[seasonKey] || []) {
      const ext = ep.container_extension || "mp4";
      const dur = ep.info && ep.info.duration_secs ? Math.round(ep.info.duration_secs / 60) : undefined;
      eps.push({
        season: parseInt(ep.season || seasonKey, 10) || 0,
        number: parseInt(ep.episode_num, 10) || 0,
        ref: "e:" + ep.id + ":" + ext,
        title: ep.title || ("Episodio " + (ep.episode_num || "")),
        still: ep.info && ep.info.movie_image ? String(ep.info.movie_image) : undefined,
        overview: ep.info && ep.info.plot ? String(ep.info.plot) : undefined,
        airDate: ep.info && ep.info.release_date ? String(ep.info.release_date) : undefined,
        runtimeMinutes: dur,
      });
    }
  }
  eps.sort((a, b) => a.season - b.season || a.number - b.number);
  return { series, episodes: eps };
}

/* ================= Reproducción ================= */

// El enlace se busca aquí, al reproducir: nunca se guarda ni se precarga.
export async function resolve(ref) {
  const { s, u, p } = baseUrl();
  const r = String(ref);
  const eu = encodeURIComponent(u), ep = encodeURIComponent(p);
  if (r.startsWith("m:")) {
    const [, id, ext] = r.split(":");
    return { url: `${s}/movie/${eu}/${ep}/${encodeURIComponent(id)}.${ext || "mp4"}` };
  }
  if (r.startsWith("e:")) {
    const [, id, ext] = r.split(":");
    return { url: `${s}/series/${eu}/${ep}/${encodeURIComponent(id)}.${ext || "mp4"}` };
  }
  const id = r.replace(/^ch/, "");
  return {
    url: `${s}/live/${eu}/${ep}/${encodeURIComponent(id)}.m3u8`,
    mime: "application/vnd.apple.mpegurl",
  };
}
