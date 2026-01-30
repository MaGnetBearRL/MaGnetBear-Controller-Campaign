import { $ } from "../dom.js";
import { copyToClipboard, fallbackPrompt } from "../utils/clipboard.js";

function getShareUrl(settings) {
  const url = settings.publicCampaignUrl;
  const isPlaceholder = !url || url.includes("REPLACE_ME") || url.includes("example.com");
  return isPlaceholder ? window.location.href : url;
}

export function initShare(settings) {
  const signBtn = $("signBtn");
  const shareBtn = $("shareBtn");

  // Share modal elements
  const overlay = $("shareModal");
  const closeBtn = $("share_closeBtn");
  const urlInput = $("share_url");
  const copyBtn = $("share_copyBtn");
  const dialog = overlay ? overlay.querySelector(".modalDialog") : null;

  if (signBtn) signBtn.href = settings.petitionUrl;

  // If no modal markup, bail
  if (!shareBtn || !overlay || !dialog || !urlInput) return;

  const shareUrl = getShareUrl(settings);

  function setPageScrollLocked(isLocked) {
    document.documentElement.classList.toggle("modalOpen", isLocked);
    document.body.classList.toggle("modalOpen", isLocked);
  }

  function openShare() {
    urlInput.value = shareUrl;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    setPageScrollLocked(true);
    
    // Select the URL text for easy copying
    setTimeout(() => {
      urlInput.select();
      urlInput.setSelectionRange(0, urlInput.value.length);
    }, 50);
  }

  function closeShare() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    setPageScrollLocked(false);
    
    // Reset copy button text
    if (copyBtn) copyBtn.textContent = "COPY";
  }

  // Open modal on share button click
  shareBtn.addEventListener("click", openShare);

  // Close on close button
  if (closeBtn) {
    closeBtn.addEventListener("click", closeShare);
  }

  // Close on click outside
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeShare();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeShare();
    }
  });

  // Copy button
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await copyToClipboard(shareUrl);
        copyBtn.textContent = "COPIED!";
        setTimeout(() => (copyBtn.textContent = "COPY"), 2000);
      } catch {
        fallbackPrompt("Copy this link:", shareUrl);
      }
    });
  }
}

export function getCampaignUrl(settings) {
  return getShareUrl(settings);
}
