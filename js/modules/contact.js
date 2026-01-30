import { $ } from "../dom.js";
import { copyToClipboard, fallbackPrompt } from "../utils/clipboard.js";
import { getCampaignUrl } from "./share.js";

export function initContactBox(settings) {
  // --- Elements ---
  const openBtn = $("contactOpenBtn");

  const overlay = $("contactModal");
  const closeBtn = $("contact_closeBtn");
  const dialog = overlay ? overlay.querySelector(".modalDialog") : null;

  const typeEl = $("contact_type");
  const handleEl = $("contact_handle");
  const msgEl = $("contact_message");
  const sendBtn = $("contact_sendBtn");
  const copyBtn = $("contact_copyBtn");

  // If modal markup isn't on the page, bail quietly.
  if (!overlay || !dialog) return;

  // Keep the actual email out of HTML. (Not "secure", but removes the easy scrape/copy target.)
  const toEmail = (() => {
    const parts = ["MaGnetBear", "proton", "me"];
    return `${parts[0]}@${parts[1]}.${parts[2]}`;
  })();

  let lastFocusEl = null;

  function setPageScrollLocked(isLocked) {
    document.documentElement.classList.toggle("modalOpen", isLocked);
    document.body.classList.toggle("modalOpen", isLocked);
  }

  function openContact({ focus = true } = {}) {
    lastFocusEl = document.activeElement;

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    setPageScrollLocked(true);

    if (focus && msgEl) {
      setTimeout(() => msgEl.focus(), 0);
    }
  }

  function closeContact({ restoreFocus = true } = {}) {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    setPageScrollLocked(false);

    if (restoreFocus && lastFocusEl && typeof lastFocusEl.focus === "function") {
      setTimeout(() => lastFocusEl.focus(), 0);
    }
  }

  function trapKeys(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeContact();
      return;
    }

    // Keep tab focus inside modal
    if (e.key === "Tab") {
      const focusables = dialog.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || active === dialog) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  // --- Open / Close bindings ---
  if (openBtn) openBtn.addEventListener("click", () => openContact());
  if (closeBtn) closeBtn.addEventListener("click", () => closeContact());

  // Click outside closes
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeContact({ restoreFocus: true });
  });

  // Key handling while open
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    trapKeys(e);
  });

  // Support deep-linking to campaign.html#contact
  function maybeOpenFromHash() {
    if (window.location.hash === "#contact") {
      openContact({ focus: false });
    }
  }
  window.addEventListener("hashchange", maybeOpenFromHash);
  maybeOpenFromHash();

  // --- Mailto + copy behavior (same as before, but fixed) ---
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
