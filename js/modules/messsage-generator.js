import { $ } from "../dom.js";
import { copyToClipboard, fallbackPrompt } from "../utils/clipboard.js";
import { getCampaignUrl } from "./share.js";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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

  function buildMessage() {
    const vibe = msgGen.vibe ? msgGen.vibe.value : "supportive";
    const support = msgGen.support ? msgGen.support.value : "new";
    const story = msgGen.story ? msgGen.story.value : "respect";
    const interest = msgGen.interest ? msgGen.interest.value : "none";
    const platform = msgGen.platform ? msgGen.platform.value : "x";

    const includeAim = msgGen.includeAim ? msgGen.includeAim.checked : false;
    const includeLink = msgGen.includeLink ? msgGen.includeLink.checked : true;

    const who =
      msgGen.name && msgGen.name.value.trim().length > 0
        ? msgGen.name.value.trim()
        : "";

    const aimToken = includeAim ? "@AIMControllers " : "";
    const shareUrl = getCampaignUrl(settings);
    const linkToken = includeLink ? ` ${shareUrl}` : "";

    const supportLines = {
      fan: [
        "I watch MaGnetBear and appreciate the grind.",
        "His Rocket League content is genuinely fun to watch.",
        "Rooting for him to be back online soon."
      ],
      new: [
        "I just found MaGnetBear and I’m already invested.",
        "New viewer here—looking forward to the return.",
        "Recently discovered the channel and I’m rooting for him."
      ],
      friend: [
        "I know him and he’s been counting the days.",
        "Friend of his—he’s eager to be back online.",
        "I’m in his orbit and the wait has been real."
      ],
      neutral: [
        "Neutral observer here—just sending a kind note.",
        "No personal connection—just being supportive.",
        "Dropping a quick positive message."
      ]
    };

    const storyLines = {
      respect: [
        "Appreciate the repair work and attention to detail.",
        "Thanks for taking care of repairs—much respect.",
        "Wishing a smooth repair and safe return."
      ],
      timeline: [
        "Hoping the turnaround stays on track if possible.",
        "Fingers crossed for an on-time return.",
        "Hope the process stays smooth and timely."
      ],
      backonline: [
        "Looking forward to him being back online with his controller.",
        "Can’t wait to see him back playing comfortably again.",
        "Excited for the return so he can get back to it."
      ],
      community: [
        "Just a quick show of positive community support.",
        "Sharing a small wave of encouragement from the community.",
        "A simple supportive nudge from people watching along."
      ]
    };

    const interestLines = {
      curious: [
        "I’m also curious about AIM builds and options.",
        "This made me take a look at your lineup.",
        "I’ve been browsing and learning more."
      ],
      considering: [
        "I’m considering AIM for a future controller.",
        "This has me looking more seriously at AIM.",
        "AIM is on my short list."
      ],
      own: [
        "I’ve owned one / used one before and had a solid experience.",
        "I’ve had good experiences with AIM in the past.",
        "I’ve seen AIM builds up close—nice work."
      ],
      none: [
        "No purchase context—just being supportive.",
        "Just sending a positive message.",
        "Only here to be encouraging."
      ]
    };

    const closersByVibe = {
      supportive: [
        "Thanks again, and hope everything goes smoothly.",
        "Appreciate you.",
        "Wishing a smooth return."
      ],
      serious: [
        "Thank you for your time and support.",
        "Thanks for the work you do.",
        "Much appreciated."
      ],
      light: [
        "Hope it’s an easy fix and a safe return.",
        "Sending good vibes for a smooth turnaround.",
        "Thanks for taking care of it."
      ],
      short: [
        "Appreciate you.",
        "Thank you.",
        "All the best."
      ]
    };

    const platformFraming = {
      x: (text) => text,
      ig: (text) => text,
      email: (text) => `Hello AIM Team,\n\n${text}\n\nThank you,\n${who || "A viewer"}`
    };

    const core = [
      aimToken.trim(),
      pick(supportLines[support]),
      pick(storyLines[story]),
      pick(interestLines[interest]),
      pick(closersByVibe[vibe])
    ]
      .filter(Boolean)
      .join(" ");

    let msg = platformFraming[platform](core);

    if (platform !== "email") {
      if (who) msg = `${msg} — ${who}`;
      msg = `${msg}${linkToken}`;
    } else {
      if (includeLink) msg = `${msg}\n\nCampaign link: ${shareUrl}`;
    }

    return msg.trim();
  }

  function setOutput(text) {
    msgGen.output.textContent = text;
  }

  msgGen.generateBtn.addEventListener("click", () => {
    setOutput(buildMessage());
  });

  if (msgGen.copyBtn) {
    msgGen.copyBtn.addEventListener("click", async () => {
      const txt = msgGen.output.textContent || "";
      if (!txt || txt.includes("Pick options")) return;

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
