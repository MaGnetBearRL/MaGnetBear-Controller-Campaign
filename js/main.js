import { SETTINGS } from "./config.js";
import { initMessageGenerator } from "./modules/message-generator.js";
import { initSignatureWall } from "./modules/signatures.js";
import { initUpdatesFeed } from "./modules/updates.js";
import { initPostsFeed } from "./modules/posts.js";

function log(...args) {
  if (SETTINGS.debug) console.log(...args);
}

function safeInit(label, fn) {
  try {
    const ret = fn();

    if (ret && typeof ret.then === "function") {
      ret.catch((e) => console.error(`[${label}] init failed (async):`, e));
    }

    log(`[${label}] init ok`);
  } catch (e) {
    console.error(`[${label}] init failed:`, e);
  }
}

log("[Main] buildVersion:", SETTINGS.buildVersion);

// Cache-bust Countdown module too (it’s going to change a lot during polish)
safeInit("Countdown", async () => {
  const mod = await import(`./modules/countdown.js?v=${SETTINGS.buildVersion}`);
  return mod.initCountdown(SETTINGS);
});

// Cache-bust Share module
safeInit("Share", async () => {
  const mod = await import(`./modules/share.js?v=${SETTINGS.buildVersion}`);
  return mod.initShare(SETTINGS);
});
safeInit("MessageGenerator", () => initMessageGenerator(SETTINGS));
safeInit("SignatureWall", () => initSignatureWall(SETTINGS));

// Cache-bust Contact module (we already learned this lesson)
safeInit("ContactBox", async () => {
  const mod = await import(`./modules/contact.js?v=${SETTINGS.buildVersion}`);
  return mod.initContactBox(SETTINGS);
});

safeInit("UpdatesFeed", () => initUpdatesFeed());
safeInit("PostsFeed", () => initPostsFeed());

// Cache-bust Updates modal module
safeInit("UpdatesModal", async () => {
  const mod = await import(`./modules/collapsible.js?v=${SETTINGS.buildVersion}`);
  return mod.initCollapsible();
});