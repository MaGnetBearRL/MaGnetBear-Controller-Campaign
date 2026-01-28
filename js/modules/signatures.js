import { $ } from "../dom.js";

export async function initSignatureWall(settings) {
  const totalEl = $("sig_total");
  const approvedEl = $("sig_approved");
  const listEl = $("sig_list");
  const emptyEl = $("sig_empty");

  if (!totalEl || !approvedEl || !listEl) return;

  try {
    const resp = await fetch("./signatures.json", { cache: "no-store" });
    if (!resp.ok) return;

    const data = await resp.json();
    const total = Number(data.total_signatures ?? 0);
    const approved = Number(data.approved_signatures ?? 0);
    const entries = Array.isArray(data.entries) ? data.entries : [];

    totalEl.textContent = String(total);
    approvedEl.textContent = String(approved);

    listEl.innerHTML = "";

    if (entries.length === 0) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    for (const rawName of entries.slice(0, settings.signatureLimit)) {
      const name = String(rawName).trim();
      if (!name) continue;

      const chip = document.createElement("div");
      chip.className = "sigChip";
      chip.textContent = name;
      listEl.appendChild(chip);
    }
  } catch {
    return;
  }
}
