import { $ } from "../dom.js";
import { copyToClipboard, fallbackPrompt } from "../utils/clipboard.js";
import { getCampaignUrl } from "./share.js";

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function norm(raw) {
  return (raw || "").toString().trim();
}

function safeValue(selectEl, fallback) {
  if (!selectEl) return fallback;
  const v = norm(selectEl.value);
  return v || fallback;
}

function maybe(prob) {
  return Math.random() < prob;
}

function ensureEndsWithPeriod(s) {
  const t = norm(s);
  if (!t) return "";
  if (/[.!?…]$/.test(t)) return t;
  return t + ".";
}

function tagsForPlatform(platform) {
  const p = (platform || "").toLowerCase();

  // "pl" is "Polish (HQ)" mode; still uses X-style tags for clean copy/paste.
  if (p === "pl") return { aim: "@AimControllerss", magnet: "@MaGnetBearRL" };

  // Always tag AIM + MaGnetBear.
  if (p === "x") return { aim: "@AimControllerss", magnet: "@MaGnetBearRL" };
  if (p === "ig") return { aim: "@aimcontrollers", magnet: "@MaGnetBearRL" };
  if (p === "yt") return { aim: "AIM Controllers", magnet: "@MaGnetBearRL" };

  return { aim: "@AimControllerss", magnet: "@MaGnetBearRL" };
}

function buildPolishHqMessage({ aim, magnet, link }) {
  // One intentionally “clean” Polish message to avoid broken translations.
  // Uses X-style tags so it stays clean when copy/pasted anywhere.
  return [
    "Cześć",
    aim + " —",
    magnet + " robi małą, żartobliwą akcję „controller rehab”, bo jego pad jest w naprawie.",
    "Jeśli możecie, rzućcie okiem:",
    link
  ].join(" ");
}

export function initMessageGenerator(settings) {
  const els = {
    platform: $("mg_platform"),
    support: $("mg_support"),
    angle: $("mg_angle"),
    generateBtn: $("mg_generateBtn"),
    output: $("mg_output"),
    copyBtn: $("mg_copyBtn")
  };

  if (!els.generateBtn || !els.output) return;

  const drills = ["double taps", "open nets", "aerials", "hi fives", "OT saves"];

  const coachMechs = [
    "walldashes",
    "resets",
    "kuxir pinches",
    "zapdashes",
    "mustys",
    "to freestyle",
    "Normal Air Roll",
    "DAR",
    "Ceiling pinches",
    "ground pinches",
    "helicopter resets",
    "speedflips",
    "wavedash kickoffs"
  ];

  const outOfPocketBits = [
    "Is 3 weeks really long enough for someone to stop role playing a bear role playing a futuristic rocket car? make it 6 to be safe."
  ];

  const openersBySupport = {
    default: [
      "Yo",
      "Quick one",
      "Okay but listen",
      "Not to be dramatic",
      "Respectfully",
      "I’m just saying",
      "Tiny update from the trenches"
    ],
    parentPet: [
      "Hello",
      "Hi",
      "Please",
      "A quick note",
      "Kindly",
      "As a member of this household"
    ]
  };

  const supportLines = {
    fan: [
      "Viewer here",
      "Hate watcher here",
      "From the clips",
      "I’ve seen the arc",
      "I mostly watch for the cats biting his face, but this controller saga is peak"
    ],
    new: [
      "New here",
      "Algorithm sent me",
      "I fell into this randomly",
      "No idea how I got here",
      "I clicked one Rocket League clip and now I’m in a controller drama timeline"
    ],
    friend: [
      "Friend-ish",
      "We’ve partied up like twice",
      "I deny knowing him altogether",
      "I know him (unfortunately)",
      "I’ve been in the server. It’s… loud right now"
    ],
    parentPet: [
      "I live with him",
      "I’m in his household",
      "I’m his parent (allegedly)",
      "Domino here",
      "Bruce here,",
      "I witness the breakdowns first hand"
    ],
    coach: [
      "As his “coach”",
      "I trained him (barely)",
      "I take partial responsibility",
      "I taught him everything he knows (tragically)",
      "I told him to grind mechanics and now society is paying the price"
    ]
  };

  const spiceLines = {
    fan: [
      "He’s doing daily posts like it’s a war journal.",
      "The self-owns are immaculate, unfortunately. No one dunks on MaGnetBear harder than MaGnetBear.",
      "This is somehow the most organized chaos I’ve ever seen.",
      "Did he build an entire website instead of touching grass? breh."
    ],
    new: [
      "I don’t even know what Rumble is and I’m still rooting for him.",
      "This page convinced me he’s either a genius or unwell, probably just unwell actually. yeah.",
      "I’ve never been more confused and supportive at the same time."
    ],
    friend: [
      "If he can’t queue, he sends essays.",
      "My notifications are fighting for their lives.",
      "Discord is taking collateral damage."
    ],
    parentPet: [
      "His controller is in repair and he’s narrating the saga to anyone who will listen.",
      "He’s doing training packs in his head and monologuing about it. The instability is real.",
      "He’s turned a controller repair into an entire storyline. Serious Main Bear-achter Energy.",
      "The campaign is a bit, but the loud uncontrollable sobbing is def real."
    ],
    coach: [
      "I accept responsibility for his mechanical delusions.",
      "This is on me. My bad, everyone, I tried teaching him {mech} and he sent me pics of the broken paddles the next day.",
      "If you told me a year ago MaGnetBear would be half-decent at Rocket League now, I'd have said \"who?\".",
      "TBF, I said he needs to hit the gym IN GAME, not start juicing until he had hulk hands."
    ]
  };

  const angleLines = {
    warrantyBit: [
      "Lifetime warranty is wild",
      "That warranty is about to get its reps in.",
      "Lifetime warranty was a bold promise. GGs AIM, you're cooked.",
      "Lifetime Warranty?? MaGnetBear is def forcing that AIM warranty ff soon."
    ],
    gripStrengthBit: [
      "Either get him valium before he queues or a titanium controller he can’t crush",
      "He grips controllers like they owe him money—please send reinforcements",
      "Queue turns his hands into hydraulic presses. He needs a controller rated for construction work",
      "If a custom controller actually contributed to his rank graph/climb this season like he claims, thats insane."
    ],
    backOnline: [
      "Get him back in-game and out of my Discord messages please",
      "He can keep whiffing {drill} in freeplay in his head for a bit — it’ll be good for him",
      "When he can’t play, he types..paragraphs...Please fix this.",
      "Return the controller so my notifications can recover."
    ],
    communityNudge: [
      "Just a quick community nudge — no weird vibes",
      "Small show of support from the community",
      "Getting his controller back? Light Work. Getting his rank and dignity back...less light.",
      "A respectful little boost so the arc continues"
    ],
    timelineChill: [
      "No rush… but also he’s pacing in the dark rn.",
      "Take your time, dude is being dramatic",
      "Quality > speed, but he’s doing videos as alter-egos, its not a great sign...",
      "Hope turnaround is smooth — he’ll survive (probably)"
    ]
  };

  // Core lines are the "main sentence" so the message stays coherent.
  const coreLines = [
    "is running a goofy “controller rehab” campaign",
    "is being extra about his controller being in repair",
    "is crashing out in time consuming edits instead of ranked now. W.",
    "+ coordinated controller love letter campaigns",
    "is fine. He's just extra AF about RL, ignore it"
  ];

  function buildMessage() {
    const platform = safeValue(els.platform, "x");
    const tags = tagsForPlatform(platform);
    const link = getCampaignUrl(settings);

    // Polish HQ mode: one fixed, hand-written message.
    if (platform.toLowerCase() === "pl") {
      return buildPolishHqMessage({ aim: tags.aim, magnet: tags.magnet, link });
    }

    const supportKey = safeValue(els.support, "fan");
    const angleKey = safeValue(els.angle, "backOnline");

    const openerPool = (supportKey === "parentPet")
      ? openersBySupport.parentPet
      : openersBySupport.default;

    const opener = pick(openerPool);
    const core = pick(coreLines);

    function resolveAngle() {
      let angle = pick(angleLines[angleKey] || angleLines.backOnline);
      if (angle.includes("{drill}")) angle = angle.replaceAll("{drill}", pick(drills));
      return angle;
    }

    function resolveSpice() {
      let spice = pick(spiceLines[supportKey] || []);
      if (spice && spice.includes("{mech}")) spice = spice.replaceAll("{mech}", pick(coachMechs));
      return spice;
    }

    // Composition: allow at most 2 add-ons total to keep messages clean.
    // Add-ons are: WHO, SPICE, ANGLE, OUTOFPOCKET
    let slots = 2;

    const who = pick(supportLines[supportKey] || supportLines.fan);
    const wantWho = maybe(0.55);
    const wantSpice = maybe((supportKey === "parentPet") ? 0.50 : 0.30);
    const wantAngle = maybe(0.65);
    const wantOutOfPocket = maybe(0.10);

    const prefixParts = [];
    const suffixParts = [];

    if (slots > 0 && (wantWho || wantSpice)) {
      if (wantSpice && (!wantWho || maybe(0.55))) {
        prefixParts.push(ensureEndsWithPeriod(resolveSpice()));
        slots -= 1;
      } else if (wantWho) {
        prefixParts.push(ensureEndsWithPeriod(who));
        slots -= 1;
      }
    }

    if (slots > 0 && wantAngle) {
      suffixParts.push("— " + resolveAngle());
      slots -= 1;
    }

    if (slots > 0 && wantOutOfPocket) {
      suffixParts.push("Also, " + pick(outOfPocketBits));
      slots -= 1;
    }

    const prefix = prefixParts.length ? prefixParts.join(" ") + " " : "";
    const suffix = suffixParts.length ? " " + suffixParts.join(" ") : "";

    // IMPORTANT: no parentheses around tags/link (best chance the @ pings everywhere)
    return `${opener}: ${prefix}${tags.magnet} ${core}${suffix} ${tags.aim} ${link}`
      .replace(/\s+/g, " ")
      .trim();
  }

  function setOutput(text) {
    els.output.textContent = text;
  }

  els.generateBtn.addEventListener("click", () => {
    try {
      setOutput(buildMessage());
    } catch (err) {
      console.error("Message generator failed:", err);
      setOutput("Message generator crashed. Open DevTools Console for details.");
    }
  });

  if (els.copyBtn) {
    els.copyBtn.addEventListener("click", async () => {
      const txt = (els.output.textContent || "").trim();
      if (!txt) return;

      try {
        await copyToClipboard(txt);
        els.copyBtn.textContent = "Copied";
        setTimeout(() => (els.copyBtn.textContent = "Copied"), 1500);
      } catch {
        fallbackPrompt("Copy this message:", txt);
      }
    });
  }
}
