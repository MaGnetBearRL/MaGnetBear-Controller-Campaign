export const SETTINGS = {
  // Bump this when you want to force-refresh module caches site-wide.
  // You can also use a git short SHA here later if you want.
  buildVersion: "mb6",

  // Toggle extra console logging in main.js without editing other files
  debug: false,

  petitionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSeCOeRVH54knJyBkPT8L1lPCYoany6K62Esq4ilu6_SlCAaLg/viewform?usp=publish-editor",

  publicCampaignUrl: "https://magnetbear.gg/campaign.html",

  // When you actually ship it, set this to the exact timestamp.
  // Example: "2026-02-01T14:12:00-05:00"
  // If left null, we’ll estimate “planned ship date” = etaIso - turnaroundDays.
  shipIso: null,

  // Default timer view (user preference is saved in localStorage after they toggle)
  timerDefaultMode: "countdown", // "countdown" | "countup"

  // This is the “3 weeks” window
  turnaroundDays: 21,

  // Your current ETA (still displayed)
  etaIso: "2026-02-28T12:00:00-05:00",

  signatureLimit: 250
};
