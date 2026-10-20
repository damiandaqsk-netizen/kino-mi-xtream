/// <reference path="./kino.d.ts" />

// Mi Xtream — plugin de Kino (capacidad "channels").
// Lee los canales en vivo de TU servidor Xtream por categorías, paginando
// de 200 en 200, en vez de bajar la lista completa de una vez (ese es el
// paso que Kino corta por tamaño/tiempo en la sección nativa "Mis canales").
// El servidor, el usuario y la clave se escriben en la pantalla Configurar
// del plugin dentro de Kino: nunca viajan a nadie, quedan en tu aparato.
//
// Servidor Xtream (API de XUI/Xtream Codes):
//   player_api.php?username=U&password=P&action=get_live_categories
//   player_api.php?username=U&password=P&action=get_live_streams&category_id=C
//   /live/U/P/<stream_id>.m3u8  (reproducción HLS)

const PAGE = 200;

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
  const r = await kino.fetch(url);
  // XUI responde 200 con el JSON también cuando la clave está mal ("user_info": { "auth": 0 });
  // los paneles Xtream-Masters además devuelven 401 con INVALID_AUTH para credenciales inválidas.
  if (r.status === 401) {
    throw kino.error("auth_required", "Usuario o contraseña incorrectos");
  }
  if (!r.ok) {
    throw kino.error("unavailable", "El servidor respondió " + r.status);
  }
  const body = r.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw kino.error("unavailable", "El servidor no devolvió una respuesta Xtream válida");
  }
  if (data && data.user_info && String(data.user_info.auth) === "0") {
    throw kino.error("auth_required", "Usuario o contraseña incorrectos");
  }
  return data;
}

export async function home() {
  return [];
}

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
  const page = all.slice(offset, offset + PAGE);
  const items = page.map((s) => ({
    id: "ch" + s.stream_id,
    title: s.name || ("Canal " + s.stream_id),
    categoryId: String(categoryId),
    ref: String(s.stream_id),
    logo: s.stream_icon ? String(s.stream_icon) : undefined,
  }));
  return {
    items,
    next: offset + PAGE < all.length ? String(offset + PAGE) : undefined,
  };
}

// El enlace se busca aquí, al reproducir: nunca se guarda ni se precarga.
export async function resolve(ref) {
  const { s, u, p } = baseUrl();
  const id = String(ref).replace(/^ch/, "");
  return {
    url: `${s}/live/${encodeURIComponent(u)}/${encodeURIComponent(p)}/${encodeURIComponent(id)}.m3u8`,
    mime: "application/vnd.apple.mpegurl",
  };
}
