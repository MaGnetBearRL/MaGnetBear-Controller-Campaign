import { $ } from "../dom.js";
import { parseDate, formatET } from "../utils/date.js";

export function initCountdown(settings) {
  const shipDateText = $("shipDateText");
  const etaDateText = $("etaDateText");
  const countdownEl = $("countdown");
  const statusText = $("statusText");

  const etaDate = parseDate(settings.etaIso);

  const plannedShipDate = etaDate
    ? new Date(etaDate.getTime() - settings.turnaroundDays * 24 * 60 * 60 * 1000)
    : null;

  if (shipDateText) {
    shipDateText.textContent = plannedShipDate ? formatET(plannedShipDate, false) : "TBD";
  }

  if (etaDateText) {
    etaDateText.textContent = etaDate ? formatET(etaDate, true) : "TBD";
  }

  function updateCountdown() {
    if (!etaDate) {
      if (countdownEl) countdownEl.textContent = "—";
      if (statusText) statusText.textContent = "Controller: ETA not set";
      return;
    }

    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      if (countdownEl) countdownEl.textContent = "ETA reached";
      if (statusText) statusText.textContent = "Controller: Awaiting arrival";
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (countdownEl) countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
    if (statusText) statusText.textContent = "Controller: In repair / in transit";
  }

  updateCountdown();
  setInterval(updateCountdown, 30 * 1000);
}
