import { $ } from "../dom.js";

export function initCollapsible() {
  const updatesBtn = $("updatesBtn");
  const overlay = $("updatesModal");
  const closeBtn = $("updates_closeBtn");
  const dialog = overlay ? overlay.querySelector(".modalDialog") : null;

  if (!updatesBtn || !overlay || !dialog) return;

  function setPageScrollLocked(isLocked) {
    document.documentElement.classList.toggle("modalOpen", isLocked);
    document.body.classList.toggle("modalOpen", isLocked);
  }

  function openUpdates() {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    setPageScrollLocked(true);
  }

  function closeUpdates() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    setPageScrollLocked(false);
  }

  // Open on button click
  updatesBtn.addEventListener("click", openUpdates);

  // Close on close button click
  if (closeBtn) {
    closeBtn.addEventListener("click", closeUpdates);
  }

  // Close on click outside dialog
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeUpdates();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeUpdates();
    }
  });
}
