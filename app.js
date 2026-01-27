(() => {
  "use strict";

  const SETTINGS = {
    petitionUrl: "https://forms.gle/REPLACE_ME",   // TODO: set your real petition form URL
    publicCampaignUrl: "magnetbear.gg/",          // The link people should share
    etaIso: "2026-02-28T12:00:00-05:00",          // Feb 28, 2026 @ 12:00 PM ET (fixed offset)
    turnaroundDays: 21,                           // Used to display planned ship date (ETA minus days)
    signatureLimit: 250
  };

  const $ = (id) => document.getElementById(id);

  const signBtn = $("signBtn");
  const shareBtn = $("shareBtn");

  const shipDateText = $("shipDateText");
  const etaDateText = $("etaDateText");
  const countdownEl = $("countdown");
  const statusText = $("statusText");

  if (signBtn) signBtn.href = SETTINGS.petitionUrl;

  function parseDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatET(date, withTime) {
    const opts = withTime
      ? {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York"
        }
      : {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "America/New_York"
        };

    return date.toLocaleString(undefined, opts);
  }

  function getShareUrl() {
    const url = SETTINGS.publicCampaignUrl;
    const isPlaceholder =
      !url || url.includes("REPLACE_ME") || url.includes("example.com");

    return isPlaceholder ? window.location.href : url;
  }

  const etaDate = parseDate(SETTINGS.etaIso);

  const plannedShipDate = etaDate
    ? new Date(etaDate.getTime() - SETTINGS.turnaroundDays * 24 * 60 * 60 * 1000)
    : null;

  if (shipDateText) shipDateText.textContent = plannedShipDate ? formatET(plannedShipDate, false) : "TBD";
  if (etaDateText) etaDateText.textContent = etaDate ? formatET(etaDate, true) : "TBD";

  function updateCountdown() {
    if (!etaDate) {
      if (countdownEl) countdownEl.textContent = "—";
      if (statusText) statusText.textContent = "Controller: ETA not set";
      return;
    }

    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      if (countdownEl) countdownEl.textContent = "ETA reached. Manifesting delivery.";
      if (statusText) statusText.textContent = "Controller: Somewhere in the postal multiverse";
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (countdownEl) countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
    if (statusText) statusText.textContent = "Controller: Out for repairs (allegedly)";
  }

  updateCountdown();
  setInterval(updateCountdown, 30 * 1000);

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = getShareUrl();

      try {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = "Link copied";
        setTimeout(() => (shareBtn.textContent = "Copy link to share"), 1500);
      } catch {
        window.prompt("Copy this link:", url);
      }
    });
  }

  // Message generator
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

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildMessage() {
    const vibe = msgGen.vibe ? msgGen.vibe.value : "funny";
    const support = msgGen.support ? msgGen.support.value : "new";
    const story = msgGen.story ? msgGen.story.value : "warranty";
    const interest = msgGen.interest ? msgGen.interest.value : "curious";
    const platform = msgGen.platform ? msgGen.platform.value : "x";

    const includeAim = msgGen.includeAim ? msgGen.includeAim.checked : false;
    const includeLink = msgGen.includeLink ? msgGen.includeLink.checked : true;

    const who =
      msgGen.name && msgGen.name.value.trim().length > 0
        ? msgGen.name.value.trim()
        : "";

    const aimToken = includeAim ? "@AIMControllers " : "";
    const shareUrl = getShareUrl();
    const linkToken = includeLink ? ` ${shareUrl}` : "";

    const supportLines = {
      fan: [
        "I actually like MaGnetBear’s content.",
        "His clips are stupid entertaining.",
        "I’m here for the chaos and the mechanics."
      ],
      new: [
        "I just found MaGnetBear and I’m already invested.",
        "New viewer, instantly hooked.",
        "I’m late, but I’m locked in."
      ],
      friend: [
        "I know this man and he needs help (and his controller).",
        "I can’t queue with him like this.",
        "I’m in his orbit and it’s getting worse by the day."
      ],
      neutral: [
        "I’m neutral, but this warranty arc is hilarious.",
        "I don’t even know him like that, but this bit got me.",
        "This is objectively funny."
      ]
    };

    const storyLines = {
      warranty: [
        "Warranty arc is a bit — no rush, just cheering him on.",
        "This is comedy, not a complaint. Appreciate y’all.",
        "He’s being dramatic for content, but also… please."
      ],
      ranked: [
        "He’s spiraling in ranked without it. The whiffs are historic.",
        "Ranked is not safe right now. He needs the good sticks back.",
        "I witnessed the backup controller era. It’s grim."
      ],
      rumble: [
        "Rumble is suffering without that controller. Society is collapsing.",
        "The pitch misses him. Especially Rumble.",
        "This is a Rumble emergency (respectfully)."
      ],
      reunion: [
        "We need the reunion montage when it returns.",
        "I’m only here for the controller reunion episode.",
        "Return arc finale is going to feed families."
      ]
    };

    const interestLines = {
      considering: [
        "I’m genuinely considering AIM because of this series.",
        "This campaign put AIM on my radar, not gonna lie.",
        "This bit made me actually look at AIM controllers."
      ],
      curious: [
        "I’m curious and browsing your stuff now.",
        "This made me peek the site. Interesting lineup.",
        "I’m looking into AIM because of the content."
      ],
      own: [
        "I’ve owned one / used one before — solid experience.",
        "I’ve had AIM on my radar for a while.",
        "I’ve seen AIM builds up close — good work."
      ],
      later: [
        "Not buying today, but this is great marketing.",
        "Maybe later — still love the bit.",
        "I’m here for the story, but you’ve got my attention."
      ]
    };

    const closersByVibe = {
      funny: [
        "Respectfully requesting the safe return of his beloved controller.",
        "Please return his sticks before he starts writing notebook entries.",
        "No rush. But also… the pitch misses him."
      ],
      serious: [
        "Appreciate the work you do. Looking forward to seeing him back online.",
        "Thanks for taking care of repairs — wishing a smooth turnaround.",
        "Much respect. Hope it gets back to him soon."
      ],
      chaotic: [
        "This is a peaceful request from a totally normal community.",
        "We are calm. We are stable. We are signing petitions.",
        "We are approaching this with decorum (barely)."
      ],
      short: [
        "Bring him back online. Respectfully.",
        "Return the controller. Kindly.",
        "We miss the content. Please."
      ]
    };

    const platformFraming = {
      x: (text) => text,
      ig: (text) => `${text}\n\n(also this is hilarious)`,
      email: (text) =>
        `Hello AIM Team,\n\n${text}\n\nThank you,\n${who || "A viewer"}`
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
    if (!msgGen.output) return;
    msgGen.output.textContent = text;
  }

  if (msgGen.generateBtn) {
    msgGen.generateBtn.addEventListener("click", () => {
      setOutput(buildMessage());
    });
  }

  if (msgGen.copyBtn) {
    msgGen.copyBtn.addEventListener("click", async () => {
      if (!msgGen.output) return;

      const txt = msgGen.output.textContent || "";
      if (!txt || txt.includes("Pick options")) return;

      try {
        await navigator.clipboard.writeText(txt);
        msgGen.copyBtn.textContent = "Copied";
        setTimeout(() => (msgGen.copyBtn.textContent = "Copy message"), 1500);
      } catch {
        window.prompt("Copy this message:", txt);
      }
    });
  }

  // Signature wall (approved-only)
  async function loadSignatures() {
    const totalEl = $("sig_total");
    const approvedEl = $("sig_approved");
    const listEl = $("sig_list");
    const emptyEl = $("sig_empty");

    if (!totalEl || !approvedEl || !listEl) return;

    try {
      const resp = await fetch("./signatures.json", { cache: "no-store" });
      if (!resp.ok) return;

      const data = await resp.json();
      const total = Number(data.total_signatures ?? 0);
      const approved = Number(data.approved_signatures ?? 0);
      const entries = Array.isArray(data.entries) ? data.entries : [];

      totalEl.textContent = String(total);
      approvedEl.textContent = String(approved);

      listEl.innerHTML = "";

      if (entries.length === 0) {
        if (emptyEl) emptyEl.style.display = "";
        return;
      }

      if (emptyEl) emptyEl.style.display = "none";

      for (const rawName of entries.slice(0, SETTINGS.signatureLimit)) {
        const name = String(rawName).trim();
        if (!name) continue;

        const chip = document.createElement("div");
        chip.className = "sigChip";
        chip.textContent = name;
        listEl.appendChild(chip);
      }
    } catch {
      // Intentionally ignore failures (offline / missing file / etc.)
    }
  }

  loadSignatures();

  // Contact box (mailto builder)
  (function initContactBox() {
    const toEmail = "MaGnetBear@proton.me";

    const typeEl = $("contact_type");
    const handleEl = $("contact_handle");
    const msgEl = $("contact_message");
    const sendBtn = $("contact_sendBtn");
    const copyBtn = $("contact_copyBtn");

    if (!sendBtn || !msgEl || !typeEl) return;

    function buildSubject() {
      const type = typeEl.value || "Message";
      return `[Controller Campaign] ${type}`;
    }

    function buildBody() {
      const type = typeEl.value || "Message";
      const handle = handleEl && handleEl.value ? handleEl.value.trim() : "";
      const msg = msgEl.value ? msgEl.value.trim() : "";

      const lines = [];
      lines.push(`Type: ${type}`);
      if (handle) lines.push(`From: ${handle}`);
      lines.push("");
      lines.push(msg || "(no message written)");
      lines.push("");
      lines.push("— Sent from the MaGnetBear controller campaign site");
      lines.push(getShareUrl());

      return lines.join("\n");
    }

    sendBtn.addEventListener("click", () => {
      const subject = encodeURIComponent(buildSubject());
      const body = encodeURIComponent(buildBody());
      window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = buildBody();
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied";
          setTimeout(() => (copyBtn.textContent = "Copy message text"), 1500);
        } catch {
          window.prompt("Copy this text:", text);
        }
      });
    }
  })();
})();
