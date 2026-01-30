import { $ } from "../dom.js";
import { parseDate, formatET } from "../utils/date.js";

/**
 * Timer carousel logic.
 *
 * We render ALL timer views using the same horizontal rotor-box layout
 * (the #countup element).
 *
 * FlipDown remains loaded as a vendor dependency, but we keep it hidden
 * to prevent the duplicated / vertically-wrapped display you were seeing.
 */
export function initCountdown(settings) {
  const shipDateText = $("shipDateText");
  const etaDateText = $("etaDateText");
  const statusText = $("statusText");

  const titleEl = $("timerViewTitle");
  const countEl = $("timerViewCount");
  const dotsEl = $("timerDots");

  const prevBtn = $("timerPrev");
  const nextBtn = $("timerNext");

  // FlipDown mount (kept hidden for now)
  const flipdownEl = $("flipdown");

  // Our single, consistent display
  const countupEl = $("countup");

  const cuDays = $("cu_days");
  const cuHours = $("cu_hours");
  const cuMinutes = $("cu_minutes");
  const cuSeconds = $("cu_seconds");

  if (!countupEl || !titleEl || !countEl || !dotsEl || !prevBtn || !nextBtn) return;

  const etaDate = parseDate(settings.etaIso);

  const plannedShipDate = etaDate
    ? new Date(etaDate.getTime() - settings.turnaroundDays * 24 * 60 * 60 * 1000)
    : null;

  if (shipDateText) shipDateText.textContent = plannedShipDate ? formatET(plannedShipDate, true) : "TBD";
  if (etaDateText) etaDateText.textContent = etaDate ? formatET(etaDate, true) : "TBD";

  // Keep your existing hardcode unless you tell me otherwise.
  const season21End = parseDate("2026-03-11T12:00:00-05:00");

  const views = [
    {
      key: "countup",
      title: "TIME WITHOUT CONTROLLER",
      mode: "countup",
      from: plannedShipDate
    },
    {
      key: "eta",
      title: "ETA TO CONTROLLER REUNION",
      mode: "countdown",
      target: etaDate
    },
    {
      key: "s21",
      title: "COUNTDOWN TO END OF ROCKET LEAGUE SEASON 21",
      mode: "countdown",
      target: season21End
    }
  ];

  let idx = 0;
  let activeTimer = null;

  function setStatusFromDates() {
    if (!statusText) return;

    const now = new Date();

    if (!plannedShipDate || !etaDate) {
      statusText.textContent = "Controller: Status unknown";
      return;
    }

    if (now.getTime() < plannedShipDate.getTime()) {
      statusText.textContent = "Controller: Not shipped yet";
      return;
    }

    if (now.getTime() >= plannedShipDate.getTime() && now.getTime() < etaDate.getTime()) {
      statusText.textContent = "Controller: In repair / in transit";
      return;
    }

    statusText.textContent = "Controller: ETA reached (awaiting arrival)";
  }

  function stopActiveTimer() {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
  }

  function showRotorLayoutOnly() {
    // Keep FlipDown completely hidden (we can remove later if you decide to).
    if (flipdownEl) {
      flipdownEl.hidden = true;
      flipdownEl.innerHTML = "";
    }
    countupEl.hidden = false;
  }

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

  function renderRotorValues(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));

    const days = Math.floor(s / (24 * 3600));
    const hours = Math.floor((s % (24 * 3600)) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    // Days: show 2 digits until it grows past 99, then grow naturally
    const dayDigits = days >= 100 ? String(days).length : 2;

    setRotors(cuDays, days, dayDigits);
    setRotors(cuHours, hours, 2);
    setRotors(cuMinutes, minutes, 2);
    setRotors(cuSeconds, seconds, 2);
  }

  function startCountup(fromDate) {
    stopActiveTimer();
    showRotorLayoutOnly();

    function tick() {
      const now = new Date();
      const start = fromDate ? fromDate.getTime() : now.getTime();
      const diffMs = Math.max(0, now.getTime() - start);
      renderRotorValues(diffMs / 1000);
    }

    tick();
    activeTimer = setInterval(tick, 1000);
  }

  function startCountdown(toDate) {
    stopActiveTimer();
    showRotorLayoutOnly();

    function tick() {
      if (!toDate) {
        renderRotorValues(0);
        return;
      }
      const now = new Date();
      const diffMs = Math.max(0, toDate.getTime() - now.getTime());
      renderRotorValues(diffMs / 1000);
    }

    tick();
    activeTimer = setInterval(tick, 1000);
  }

  function renderDots() {
    dotsEl.innerHTML = "";

    views.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "timerDot" + (i === idx ? " active" : "");
      b.setAttribute("aria-label", `Timer ${i + 1}: ${v.title}`);
      b.addEventListener("click", () => {
        idx = i;
        renderView();
      });
      dotsEl.appendChild(b);
    });
  }

  function renderView() {
    setStatusFromDates();

    const v = views[idx];

    titleEl.textContent = v.title;
    countEl.textContent = `${idx + 1} / ${views.length}`;

    renderDots();

    if (v.mode === "countup") {
      startCountup(v.from);
    } else {
      startCountdown(v.target);
    }
  }

  function goPrev() {
    idx = (idx - 1 + views.length) % views.length;
    renderView();
  }

  function goNext() {
    idx = (idx + 1) % views.length;
    renderView();
  }

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);

  renderView();
}
