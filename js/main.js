import { SETTINGS } from "./config.js";
import { initCountdown } from "./modules/countdown.js";
import { initShare } from "./modules/share.js";
import { initMessageGenerator } from "./modules/message-generator.js";
import { initSignatureWall } from "./modules/signatures.js";
import { initContactBox } from "./modules/contact.js";
import { initUpdatesFeed } from "./modules/updates.js";
import { initPostsFeed } from "./modules/posts.js";

function log(...args) {
  if (SETTINGS.debug) console.log(...args);
}

function safeInit(label, fn) {
  try {
    const ret = fn();
    // Support async inits without awaiting them (they can handle their own errors)
    if (ret && typeof ret.then === "function") {
      ret.catch((e) => console.error(`[${label}] init failed (async):`, e));
    }
    log(`[${label}] init ok`);
  } catch (e) {
    console.error(`[${label}] init failed:`, e);
  }
}

// Helpful in case you ever need to verify the running build quickly.
log("[Main] buildVersion:", SETTINGS.buildVersion);

safeInit("Countdown", () => initCountdown(SETTINGS));
safeInit("Share", () => initShare(SETTINGS));
safeInit("MessageGenerator", () => initMessageGenerator(SETTINGS));
safeInit("SignatureWall", () => initSignatureWall(SETTINGS));
safeInit("ContactBox", () => initContactBox(SETTINGS));
safeInit("UpdatesFeed", () => initUpdatesFeed());
safeInit("PostsFeed", () => initPostsFeed());
