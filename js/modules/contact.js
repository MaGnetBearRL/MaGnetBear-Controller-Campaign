import { $ } from "../dom.js";
import { copyToClipboard, fallbackPrompt } from "../utils/clipboard.js";
import { getCampaignUrl } from "./share.js";

export function initContactBox(settings) {
  const toEmail = "MaGnetBear@proton.me";

  const typeEl = $("contact_type");
  const handleEl = $("contact_handle");
  const msgEl = $("contact_message");
  const sendBtn = $("contact_sendBtn");
  const copyBtn = $("contact_copyBtn");

  if (!sendBtn || !msgEl || !typeEl) return;

  function buildSubject() {
    const type = typeEl.value || "Message";
    return `[magnetbear.gg] ${type}`;
  }

  function buildBody() {
    const type = typeEl.value || "Message";
    const handle = handleEl && handleEl.value ? handleEl.value.trim() : "";
    const msg = msgEl.value ? msgEl.value.trim() : "";

    const lines = [];
    lines.push(`Type: ${type}`);
    if (handle) lines.push(`From: ${handle}`);
    lines.push("");
    lines.push(msg || "(no message written)");
    lines.push("");
    lines.push("— Sent from magnetbear.gg");
    lines.push(getCampaignUrl(settings));

    return lines.join("\n");
  }

  sendBtn.addEventListener("click", () => {
    const subject = encodeURIComponent(buildSubject());
    const body = encodeURIComponent(buildBody());
    window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = buildBody();
      try {
        await copyToClipboard(text);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy message text"), 1500);
      } catch {
        fallbackPrompt("Copy this text:", text);
      }
    });
  }
}
