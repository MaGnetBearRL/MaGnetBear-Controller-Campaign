import { $ } from "../dom.js";

const SIGNATURE_GOAL = 5000;
const CHIP_STAGGER_DELAY = 40; // ms between each chip animation
const SIGNED_FLAG_KEY = "magnetbear_just_signed";
const SIGNED_FLAG_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Live Google Sheet CSV URL (published to web)
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2OBJcuF8Ou9z2a9-68cLtIEV1nDSuWFhJpvhbbVsR9Z4Ez4m3HbtiKjUmKOsqaNXJjeM9Xs_zsyPa/pub?gid=867923593&single=true&output=csv";

// Column headers we care about (must match sheet exactly)
const COL_APPROVAL_STATUS = "approval_status";
const COL_PUBLIC_DISPLAY_NAME = "public_display_name";

// Approval statuses that count as "approved" for display
const APPROVED_STATUSES = new Set(["approved", "auto_approved"]);

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ",") {
        // Field separator
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  // Don't forget the last field
  result.push(current.trim());

  return result;
}

/**
 * Fetch and parse signatures from Google Sheet
 */
async function fetchSignaturesFromSheet() {
  const resp = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Failed to fetch sheet: ${resp.status}`);
  }

  const csvText = await resp.text();
  const rows = parseCSV(csvText);

  // Count totals and extract approved names
  let totalSignatures = rows.length;
  const approvedNames = [];

  for (const row of rows) {
    const status = (row[COL_APPROVAL_STATUS] || "").trim().toLowerCase();
    const name = (row[COL_PUBLIC_DISPLAY_NAME] || "").trim();

    if (APPROVED_STATUSES.has(status) && name) {
      approvedNames.push(name);
    }
  }

  return {
    total: totalSignatures,
    approved: approvedNames.length,
    entries: approvedNames
  };
}

/**
 * Check if user just came back from signing the petition
 */
function checkJustSigned() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("signed") || params.has("justSigned")) {
    return true;
  }

  const flagData = localStorage.getItem(SIGNED_FLAG_KEY);
  if (!flagData) return false;

  try {
    const { timestamp } = JSON.parse(flagData);
    const age = Date.now() - timestamp;
    return age < SIGNED_FLAG_EXPIRY;
  } catch {
    return false;
  }
}

/**
 * Clear the signed flag after we've used it
 */
function clearSignedFlag() {
  localStorage.removeItem(SIGNED_FLAG_KEY);

  const url = new URL(window.location.href);
  if (url.searchParams.has("signed") || url.searchParams.has("justSigned")) {
    url.searchParams.delete("signed");
    url.searchParams.delete("justSigned");
    window.history.replaceState({}, "", url.pathname + url.hash);
  }
}

/**
 * Set the signed flag (called when user clicks Sign Petition button)
 */
export function setSignedFlag() {
  localStorage.setItem(
    SIGNED_FLAG_KEY,
    JSON.stringify({ timestamp: Date.now() })
  );
}

/**
 * Animate a counter from startVal to endVal
 */
function animateCounter(el, startVal, endVal, duration = 600) {
  const startTime = performance.now();
  const diff = endVal - startVal;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + diff * eased);

    el.textContent = String(current);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.classList.add("sigIncrement");
      setTimeout(() => el.classList.remove("sigIncrement"), 800);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Update the progress bar
 */
function updateProgressBar(total) {
  const fillEl = $("sig_progress_fill");
  const percentEl = $("sig_progress_percent");
  const goalCurrentEl = $("sig_goal_current");

  const percent = Math.min((total / SIGNATURE_GOAL) * 100, 100);
  const percentRounded = Math.round(percent * 10) / 10;

  // Update the current count in the label
  if (goalCurrentEl) {
    goalCurrentEl.textContent = String(total);
  }

  // Update percent text
  if (percentEl) {
    percentEl.textContent = `${percentRounded}%`;
  }

  // Animate the fill bar
  if (fillEl) {
    requestAnimationFrame(() => {
      fillEl.style.width = `${percent}%`;
    });
  }
}

/**
 * Scroll smoothly to the signature wall section
 */
function scrollToSignatureWall() {
  const section = $("signatureWall");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export async function initSignatureWall(settings) {
  const totalEl = $("sig_total");
  const approvedEl = $("sig_approved");
  const listEl = $("sig_list");
  const emptyEl = $("sig_empty");

  if (!totalEl || !approvedEl || !listEl) {
    console.warn("[SignatureWall] Missing required DOM elements");
    return;
  }

  const justSigned = checkJustSigned();

  // If user just signed, scroll to wall and clear the flag
  if (justSigned) {
    setTimeout(() => {
      scrollToSignatureWall();
      clearSignedFlag();
    }, 300);
  }

  // Hook up the Sign Petition button to set the flag when clicked
  const signBtn = $("signBtn");
  if (signBtn) {
    signBtn.addEventListener("click", () => {
      setSignedFlag();
    });
  }

  try {
    console.log("[SignatureWall] Fetching live data from Google Sheets...");
    
    const data = await fetchSignaturesFromSheet();
    const { total, approved, entries } = data;

    console.log(`[SignatureWall] Total: ${total}, Approved: ${approved}, Entries: ${entries.length}`);

    // If just signed, animate the counter from previous value
    if (justSigned) {
      const prevTotal = Math.max(0, total - 1);
      const prevApproved = Math.max(0, approved - 1);

      totalEl.textContent = String(prevTotal);
      approvedEl.textContent = String(prevApproved);

      setTimeout(() => {
        animateCounter(totalEl, prevTotal, total, 800);
        animateCounter(approvedEl, prevApproved, approved, 800);
      }, 600);
    } else {
      totalEl.textContent = String(total);
      approvedEl.textContent = String(approved);
    }

    // Update progress bar
    updateProgressBar(total);

    // Clear existing chips
    listEl.innerHTML = "";

    if (entries.length === 0) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    // Render chips with staggered animation
    const limit = settings.signatureLimit || 250;
    const displayEntries = entries.slice(0, limit);

    displayEntries.forEach((name, index) => {
      const chip = document.createElement("div");
      chip.className = "sigChip";
      chip.textContent = name;

      // Stagger the animation delay
      const delay = index * CHIP_STAGGER_DELAY;
      chip.style.animationDelay = `${delay}ms`;

      // If this is the "newest" chip and user just signed, highlight it
      if (justSigned && index === 0) {
        chip.classList.add("sigNew");
      }

      listEl.appendChild(chip);
    });

  } catch (err) {
    console.error("[SignatureWall] Failed to load signatures:", err);
    
    // Fallback: try loading from local JSON file
    try {
      console.log("[SignatureWall] Trying fallback to signatures.json...");
      const resp = await fetch("./signatures.json", { cache: "no-store" });
      if (resp.ok) {
        const fallbackData = await resp.json();
        totalEl.textContent = String(fallbackData.total_signatures ?? 0);
        approvedEl.textContent = String(fallbackData.approved_signatures ?? 0);
        updateProgressBar(fallbackData.total_signatures ?? 0);
      }
    } catch {
      // Silent fail on fallback
    }
  }
}
