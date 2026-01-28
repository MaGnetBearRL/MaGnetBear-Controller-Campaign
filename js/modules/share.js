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

  if (signBtn) signBtn.href = settings.petitionUrl;

  if (!shareBtn) return;

  shareBtn.addEventListener("click", async () => {
    const url = getShareUrl(settings);

    try {
      await copyToClipboard(url);
      shareBtn.textContent = "Link copied";
      setTimeout(() => (shareBtn.textContent = "Copy link to share"), 1500);
    } catch {
      fallbackPrompt("Copy this link:", url);
    }
  });
}

export function getCampaignUrl(settings) {
  return getShareUrl(settings);
}
