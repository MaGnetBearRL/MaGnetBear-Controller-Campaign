import { $ } from "../dom.js";

function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
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

function renderItem(item) {
  const wrap = document.createElement("div");
  wrap.className = "feedItem";

  const top = document.createElement("div");
  top.className = "feedTop";

  const title = document.createElement("p");
  title.className = "feedTitle";
  title.textContent = item.title || "Update";

  const date = document.createElement("span");
  date.className = "feedDate";
  date.textContent = formatDateTime(item);

  top.appendChild(title);
  top.appendChild(date);

  const body = document.createElement("p");
  body.className = "feedBody";
  body.textContent = item.body || "";

  wrap.appendChild(top);
  wrap.appendChild(body);

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

export async function initUpdatesFeed() {
  const feed = $("updates_feed");
  const empty = $("updates_empty");
  if (!feed) return;

  try {
    const resp = await fetch("./data/updates.json", { cache: "no-store" });
    if (!resp.ok) throw new Error("updates");

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
