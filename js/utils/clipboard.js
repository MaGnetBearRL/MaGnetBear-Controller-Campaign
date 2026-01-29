export async function copyToClipboard(text) {
    const t = typeof text === "string" ? text : String(text ?? "");
  
    // Preferred path (secure context required)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  
    // Fallback: execCommand
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
  
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
  
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
  
    if (!ok) throw new Error("Fallback copy failed");
    return true;
  }
  
  export function fallbackPrompt(title, text) {
    window.prompt(title || "Copy this:", text || "");
  }
  