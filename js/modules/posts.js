import { $ } from "../dom.js";

const POSTS_JS_VERSION = "posts.js v4-time+videoCards";

function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function isSpotifyEmbed(url) {
  return typeof url === "string" && url.includes("open.spotify.com/embed/");
}

function extractYouTubeId(url) {
  if (typeof url !== "string") return "";

  // watch?v=VIDEO_ID
  let m = url.match(/https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // youtu.be/VIDEO_ID
  m = url.match(/https:\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // /shorts/VIDEO_ID
  m = url.match(/https:\/\/www\.youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // /embed/VIDEO_ID
  m = url.match(/https:\/\/www\.youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  return "";
}

function youtubeThumbFromId(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function formatDateTime(item) {
  const d = item?.date ? String(item.date) : "";
  const t = item?.time ? String(item.time) : "";
  const tz = item?.tz ? String(item.tz) : "";

  if (!d) return "";

  if (t && tz) return `${d} • ${t} ${tz}`;
  if (t) return `${d} • ${t}`;
  return d;
}

function renderMediaSingle(media) {
  if (!media || typeof media !== "object") return null;

  const type = String(media.type || "").toLowerCase();
  const box = document.createElement("div");
  box.className = "media";

  if (type === "image") {
    const src = media.src ? String(media.src) : "";
    if (!src) return null;

    const img = document.createElement("img");
    img.className = "mediaImg";
    img.src = src;
    img.alt = media.alt ? String(media.alt) : "Post image";
    img.loading = "lazy";
    img.decoding = "async";

    box.appendChild(img);
    return box;
  }

  // New: YouTube-style thumbnail card
  // Expected fields:
  // {
  //   type: "video",
  //   platform: "youtube" (optional),
  //   url: "https://www.youtube.com/watch?v=...",
  //   thumb: "https://i.ytimg.com/vi/.../hqdefault.jpg" (optional),
  //   label: "Watch on YouTube" (optional)
  // }
  if (type === "video") {
    const href = safeUrl(media.url || "");
    if (!href) return null;

    let thumb = media.thumb ? String(media.thumb) : "";
    if (!thumb) {
      const vid = extractYouTubeId(href);
      if (vid) thumb = youtubeThumbFromId(vid);
    }

    // If we still can't make a thumbnail, fall back to simple link
    if (!thumb) {
      const a = document.createElement("a");
      a.className = "link";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = media.label || "Watch video";
      box.appendChild(a);
      return box;
    }

    const a = document.createElement("a");
    a.className = "videoCard";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", media.label ? String(media.label) : "Watch video");

    const img = document.createElement("img");
    img.className = "videoThumb";
    img.src = thumb;
    img.alt = media.label ? String(media.label) : "Video thumbnail";
    img.loading = "lazy";
    img.decoding = "async";

    const overlay = document.createElement("div");
    overlay.className = "videoOverlay";
    overlay.textContent = "▶";

    const label = document.createElement("div");
    label.className = "videoLabel";
    label.textContent = media.label ? String(media.label) : "Watch on YouTube";

    a.appendChild(img);
    a.appendChild(overlay);
    a.appendChild(label);

    box.appendChild(a);
    return box;
  }

  if (type === "embed") {
    const rawUrl = media.url ? String(media.url) : "";
    const href = safeUrl(rawUrl);
    if (!href) return null;

    const iframe = document.createElement("iframe");
    iframe.className = "mediaEmbed";
    iframe.src = href;

    if (isSpotifyEmbed(href)) {
      iframe.classList.add("spotifyEmbed");
    }

    iframe.width = "100%";
    iframe.height = media.height ? String(media.height) : "352";
    iframe.title = media.title ? String(media.title) : "Embedded media";
    iframe.allow =
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";

    box.appendChild(iframe);
    return box;
  }

  if (type === "link") {
    const href = safeUrl(media.url || "");
    if (!href) return null;

    const a = document.createElement("a");
    a.className = "link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = media.label || href;

    box.appendChild(a);
    return box;
  }

  return null;
}

function renderMedia(media) {
  if (!media) return null;

  if (Array.isArray(media)) {
    const group = document.createElement("div");
    group.className = "mediaGroup";

    for (const m of media) {
      const el = renderMediaSingle(m);
      if (el) group.appendChild(el);
    }

    return group.childNodes.length ? group : null;
  }

  return renderMediaSingle(media);
}

function renderItem(item) {
  const wrap = document.createElement("div");
  wrap.className = "feedItem";

  const top = document.createElement("div");
  top.className = "feedTop";

  const title = document.createElement("p");
  title.className = "feedTitle";
  title.textContent = item.title || "Post";

  const date = document.createElement("span");
  date.className = "feedDate";
  date.textContent = formatDateTime(item);

  top.appendChild(title);
  top.appendChild(date);

  const body = document.createElement("p");
  body.className = "feedBody";

  // Use a text node so we can append an inline <a> right after it
  body.appendChild(document.createTextNode(item.body || ""));

  // Inline link support
  if (item.inlineLink && typeof item.inlineLink === "object") {
    const href = safeUrl(item.inlineLink.url || "");
    if (href) {
      const a = document.createElement("a");
      a.className = "link";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = item.inlineLink.label || href;

      const bodyText = String(item.body || "");
      if (bodyText.length && !/\s$/.test(bodyText)) {
        body.appendChild(document.createTextNode(" "));
      }

      body.appendChild(a);
    }
  }

  wrap.appendChild(top);
  wrap.appendChild(body);

  const mediaEl = renderMedia(item.media);
  if (mediaEl) wrap.appendChild(mediaEl);

  if (Array.isArray(item.links) && item.links.length) {
    const links = document.createElement("div");
    links.className = "feedLinks";

    for (const l of item.links) {
      const href = safeUrl(l.url || "");
      if (!href) continue;

      const a = document.createElement("a");
      a.className = "link";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = l.label || href;

      links.appendChild(a);
    }

    if (links.childNodes.length) wrap.appendChild(links);
  }

  return wrap;
}

export async function initPostsFeed() {
  const feed = $("posts_feed");
  const empty = $("posts_empty");
  if (!feed) {
    console.warn("[PostsFeed] #posts_feed not found in DOM");
    return;
  }

  console.log("[PostsFeed]", POSTS_JS_VERSION);

  try {
    const resp = await fetch("./data/posts.json", { cache: "no-store" });
    if (!resp.ok) throw new Error("posts");

    const data = await resp.json();
    const items = Array.isArray(data.items) ? data.items : [];

    feed.innerHTML = "";

    if (!items.length) {
      if (empty) empty.style.display = "";
      return;
    }

    if (empty) empty.style.display = "none";

    for (const item of items) {
      feed.appendChild(renderItem(item));
    }
  } catch (e) {
    console.error("[PostsFeed] failed:", e);
    if (empty) empty.style.display = "";
  }
}
