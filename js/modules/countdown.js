import { $ } from "../dom.js";

export function initCountdown(settings) {
  const titleEl = $("timerViewTitle");
  const countEl = $("timerViewCount");
  const dotsEl = $("timerDots");
  const prevBtn = $("timerPrev");
  const nextBtn = $("timerNext");
  const flipdownEl = $("flipdown");
  const countupEl = $("countup");

  const cuDays = $("cu_days");
  const cuHours = $("cu_hours");
  const cuMinutes = $("cu_minutes");
  const cuSeconds = $("cu_seconds");

  if (!countupEl || !titleEl) return;

  const season22End = new Date("2026-06-08T12:00:00-04:00");

  if (titleEl) titleEl.textContent = "COUNTDOWN TO END OF ROCKET LEAGUE SEASON 22";
  if (countEl) countEl.hidden = true;
  if (dotsEl) dotsEl.hidden = true;
  if (prevBtn) prevBtn.hidden = true;
  if (nextBtn) nextBtn.hidden = true;
  if (flipdownEl) {
    flipdownEl.hidden = true;
    flipdownEl.innerHTML = "";
  }
  countupEl.hidden = false;

  function setRotors(container, value, digits = 2) {
    if (!container) return;
    const s = String(Math.max(0, value)).padStart(digits, "0").slice(-digits);
    container.innerHTML = "";
    for (const ch of s) {
      const d = document.createElement("div");
      d.className = "cu-rotor";
      d.textContent = ch;
      container.appendChild(d);
    }
  }

  function tick() {
    const now = new Date();
    const diffMs = Math.max(0, season22End.getTime() - now.getTime());
    const s = Math.max(0, Math.floor(diffMs / 1000));

    const days = Math.floor(s / (24 * 3600));
    const hours = Math.floor((s % (24 * 3600)) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const dayDigits = days >= 100 ? String(days).length : 2;
    setRotors(cuDays, days, dayDigits);
    setRotors(cuHours, hours, 2);
    setRotors(cuMinutes, minutes, 2);
    setRotors(cuSeconds, seconds, 2);
  }

  tick();
  setInterval(tick, 1000);
}
