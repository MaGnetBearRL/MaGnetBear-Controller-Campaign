export const SETTINGS = {
  // Bump this when you want to force-refresh module caches site-wide.
  // You can also use a git short SHA here later if you want.
  buildVersion: "mb9",

  // Toggle extra console logging in main.js without editing other files
  debug: false,

  petitionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSeCOeRVH54knJyBkPT8L1lPCYoany6K62Esq4ilu6_SlCAaLg/viewform?usp=publish-editor",

  publicCampaignUrl: "https://magnetbear.gg",

  // Controller shipped out on this date (count-up starts here)
  shipIso: "2026-01-31T12:00:00-05:00",

  // Default timer view (user preference is saved in localStorage after they toggle)
  timerDefaultMode: "countdown", // "countdown" | "countup"

  // This is the "3 weeks" window
  turnaroundDays: 21,

  // ETA for controller return (3 weeks from ship date)
  etaIso: "2026-02-21T12:00:00-05:00",

  signatureLimit: 250
};
