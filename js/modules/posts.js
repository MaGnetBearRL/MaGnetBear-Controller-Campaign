import { $ } from "../dom.js";

function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function renderMedia(media) {
  if (!media || typeof media !== "object") return null;

  const type = media.type || "";
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

  if (type === "embed") {
    const href = safeUrl(media.url || "");
    if (!href) return null;

    const iframe = document.createElement("iframe");
    iframe.className = "mediaEmbed";
    iframe.src = href;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

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
  date.textContent = item.date || "";

  top.appendChild(title);
  top.appendChild(date);

  const body = document.createElement("p");
  body.className = "feedBody";
  body.textContent = item.body || "";

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
  if (!feed) return;

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
  } catch {
    if (empty) empty.style.display = "";
  }
}
