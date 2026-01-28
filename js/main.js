import { SETTINGS } from "./config.js";
import { initCountdown } from "./modules/countdown.js";
import { initShare } from "./modules/share.js";
import { initMessageGenerator } from "./modules/message-generator.js";
import { initSignatureWall } from "./modules/signatures.js";
import { initContactBox } from "./modules/contact.js";
import { initUpdatesFeed } from "./modules/updates.js";
import { initPostsFeed } from "./modules/posts.js";

initCountdown(SETTINGS);
initShare(SETTINGS);
initMessageGenerator(SETTINGS);
initSignatureWall(SETTINGS);
initContactBox(SETTINGS);
initUpdatesFeed();
initPostsFeed();
