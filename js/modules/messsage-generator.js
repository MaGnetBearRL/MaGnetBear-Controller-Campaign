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

function normLower(raw) {
  return norm(raw).toLowerCase();
}

function mapVibe(raw) {
  // HTML values: Supportive, Serious, Seek-Help, Short
  const v = normLower(raw);
  if (v === "supportive") return "supportive";
  if (v === "serious") return "serious";
  if (v === "short") return "short";
  if (v === "seek-help" || v === "seekhelp") return "concerned";
  return "supportive";
}

function safeKey(obj, key, fallbackKey) {
  if (obj && Object.prototype.hasOwnProperty.call(obj, key)) return key;
  if (obj && Object.prototype.hasOwnProperty.call(obj, fallbackKey)) return fallbackKey;
  return fallbackKey;
}

export function initMessageGenerator(settings) {
  const msgGen = {
    vibe: $("mg_vibe"),
    support: $("mg_support"),
    story: $("mg_story"),
    interest: $("mg_interest"),
    platform: $("mg_platform"),
    includeAim: $("mg_includeAim"),
    includeLink: $("mg_includeLink"),
    name: $("mg_name"),
    generateBtn: $("mg_generateBtn"),
    output: $("mg_output"),
    copyBtn: $("mg_copyBtn")
  };

  if (!msgGen.generateBtn || !msgGen.output) return;

  // Buckets keyed to your current <option value="..."> values
  // mg_support values: fan, new, friend, parentPet, coach
  const supportLines = {
    fan: [
      "I watch MaGnetBear and this controller saga has me invested.",
      "Long-time viewer—this is my official supportive nudge.",
      "I’m here from the RL clips and I’m rooting for a clean return.",
      "I just want the bear back in ranked so the content can continue."
    ],
    new: [
      "I’m not sure how I ended up here, but I’m locked in now.",
      "New here—this whole thing is hilarious, but also: good luck with the repair.",
      "I stumbled in by accident and somehow I’m emotionally attached to this controller arc.",
      "First time here—sending a quick supportive note."
    ],
    friend: [
      "I know him (we’ve partied up like twice) and he’s absolutely feral without that controller.",
      "Friend-ish reporting in: he’s counting the days like it’s a prison sentence.",
      "I’ve seen him play—please return the controller before he becomes fully unhinged.",
      "We’re in the same orbit and the man is down bad right now."
    ],
    parentPet: [
      "I am his mother/father/cat and I would like peace restored to the household.",
      "I live with him (as parent or pet) and I’ve seen enough. Please help.",
      "As his mother/father/cat, I request the controller’s safe return with urgency.",
      "I’m here on behalf of the household. We need the bear stabilized."
    ],
    coach: [
      "I taught him everything he knows about Rocket League (very little). Please help.",
      "As his self-appointed coach, I can confirm he needs that controller back immediately.",
      "I trained him (barely) and now I’m responsible for this. My bad.",
      "He learned everything from me, unfortunately. Please return the controller."
    ]
  };

  // mg_story values: respect, timeline, backonline, community
  const storyLines = {
    respect: [
      "Appreciate the lifetime warranty and the fact y’all actually stand behind the product.",
      "Respect for taking care of repairs the right way—no shortcuts.",
      "Big respect to the AIM team for handling warranty work like pros.",
      "Just a genuine thanks for the warranty + repair support."
    ],
    timeline: [
      "Take your time if you need to—kid probably needs the break anyway.",
      "No rush… but also the bear is losing it a little. Do what you can.",
      "Hope the timeline stays smooth, but quality > speed.",
      "Wishing a clean repair and a painless turnaround."
    ],
    backonline: [
      "Please return him to ranked—some of us need the easy W’s.",
      "Get him back online so he can stop freeplaying like a haunted Victorian child.",
      "The controller returns, the content returns. That’s the deal.",
      "Need him back in ranked asap so I can talk trash responsibly."
    ],
    community: [
      "Just a quick positive show of support from the community.",
      "Tiny community nudge: we appreciate y’all.",
      "Nothing weird—just a respectful ‘you got this’ from people watching along.",
      "A small wave of support so the bear doesn’t spiral."
    ]
  };

  // mg_interest values: curious, considering, own, none
  const interestLines = {
    curious: [
      "This has me looking at your builds and options, not gonna lie.",
      "I’m actually curious about AIM now—going down the rabbit hole.",
      "I’ve been creeping the site and learning more.",
      "Consider me ‘AIM-curious’ after this whole saga."
    ],
    considering: [
      "I’m considering AIM for my next controller.",
      "This definitely put AIM on my shortlist.",
      "I’ve been thinking about grabbing one—this warranty situation helps.",
      "Low-key shopping brain activated."
    ],
    own: [
      "I already own one / have experience—y’all make solid stuff.",
      "I’ve had good experiences with AIM personally.",
      "I’ve used AIM gear before and it treated me right.",
      "Been there, used that—AIM’s legit."
    ],
    none: [
      "No purchase context—just sending a supportive note.",
      "I’m just here for the bear and the bit.",
      "Not shopping, just vibing.",
      "No agenda—just encouragement."
    ]
  };

  // Vibe controls closers + sometimes openers/templates
  const closersByVibe = {
    supportive: [
      "Appreciate y’all. Hope the repair is smooth.",
      "Thanks for taking care of it—much respect.",
      "Wishing a clean fix and a safe trip home.",
      "Thank you for the help (and for saving the timeline)."
    ],
    serious: [
      "Thank you for your time and for supporting your customers.",
      "Appreciate the assistance—looking forward to a successful repair.",
      "Thanks again for handling this professionally.",
      "Wishing you a smooth repair process and successful return shipping."
    ],
    concerned: [
      "Real talk: hope he’s doing alright. Appreciate y’all helping get him back to normal.",
      "Hope he’s okay—this controller being gone is not helping. Thanks for the support.",
      "He’ll survive, but… appreciate you making the repair process easy.",
      "Thanks for helping get the bear back on the rails."
    ],
    short: [
      "Appreciate you.",
      "Thanks.",
      "Much respect.",
      "All love."
    ]
  };

  // Templates: make it feel less “same order every time”
  // Tokens get filled from the chosen bucket lines.
  const templatesByVibe = {
    supportive: [
      "{aim}{support} {story} {interest} {closer}{sig}{link}",
      "{aim}{story} {support} {closer}{sig}{link}",
      "{aim}{support} {interest} {story} {closer}{sig}{link}"
    ],
    serious: [
      "{aim}{support} {story} {interest} {closer}{sig}{link}",
      "{aim}{story} {support} {closer}{sig}{link}"
    ],
    concerned: [
      "{aim}{support} {story} {closer}{sig}{link}",
      "{aim}{support} {interest} {story} {closer}{sig}{link}"
    ],
    short: [
      "{aim}{story} {closer}{sig}{link}",
      "{aim}{support} {closer}{sig}{link}"
    ]
  };

  const platformFraming = {
    x: (text) => text,
    ig: (text) => text,
    email: (text, who) =>
      `Hello AIM Team,\n\n${text}\n\nThank you,\n${who || "A viewer"}`
  };

  function buildMessage() {
    const vibe = mapVibe(msgGen.vibe?.value);
    const supportKey = norm(msgGen.support?.value) || "new";
    const storyKey = norm(msgGen.story?.value) || "respect";
    const interestKey = norm(msgGen.interest?.value) || "none";
    const platform = norm(msgGen.platform?.value) || "x";

    const includeAim = !!msgGen.includeAim?.checked;
    const includeLink = msgGen.includeLink ? msgGen.includeLink.checked : true;

    const who =
      msgGen.name && msgGen.name.value.trim().length > 0
        ? msgGen.name.value.trim()
        : "";

    const shareUrl = getCampaignUrl(settings);

    const aimToken = includeAim ? "@AIMControllers " : "";
    const linkToken = includeLink ? ` ${shareUrl}` : "";
    const sigToken = who ? ` — ${who}` : "";

    const sKey = safeKey(supportLines, supportKey, "new");
    const stKey = safeKey(storyLines, storyKey, "respect");
    const iKey = safeKey(interestLines, interestKey, "none");
    const vKey = safeKey(closersByVibe, vibe, "supportive");

    const tokens = {
      aim: aimToken,
      support: pick(supportLines[sKey]),
      story: pick(storyLines[stKey]),
      interest: pick(interestLines[iKey]),
      closer: pick(closersByVibe[vKey]),
      sig: platform === "email" ? "" : sigToken,
      link: platform === "email" ? "" : linkToken
    };

    const template = pick(templatesByVibe[vKey]);
    const core = template
      .replaceAll("{aim}", tokens.aim)
      .replaceAll("{support}", tokens.support)
      .replaceAll("{story}", tokens.story)
      .replaceAll("{interest}", tokens.interest)
      .replaceAll("{closer}", tokens.closer)
      .replaceAll("{sig}", tokens.sig)
      .replaceAll("{link}", tokens.link)
      .replace(/\s+/g, " ")
      .trim();

    if (platform === "email") {
      let email = platformFraming.email(core, who);
      if (includeLink) email = `${email}\n\nCampaign link: ${shareUrl}`;
      return email.trim();
    }

    const frameFn = platformFraming[platform] || platformFraming.x;
    return frameFn(core).trim();
  }

  function setOutput(text) {
    msgGen.output.textContent = text;
  }

  msgGen.generateBtn.addEventListener("click", () => {
    try {
      setOutput(buildMessage());
    } catch (err) {
      console.error("Message generator failed:", err);
      setOutput("Message generator crashed. Open DevTools Console for the error.");
    }
  });

  if (msgGen.copyBtn) {
    msgGen.copyBtn.addEventListener("click", async () => {
      const txt = msgGen.output.textContent || "";
      if (!txt || txt.includes("Pick options") || txt.includes("crashed")) return;

      try {
        await copyToClipboard(txt);
        msgGen.copyBtn.textContent = "Copied";
        setTimeout(() => (msgGen.copyBtn.textContent = "Copy message"), 1500);
      } catch {
        fallbackPrompt("Copy this message:", txt);
      }
    });
  }
}
