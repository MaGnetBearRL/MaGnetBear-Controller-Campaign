export function parseDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  export function formatET(date, withTime) {
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
  
  export function isoToReadableET(iso, withTime) {
    const d = parseDate(iso);
    if (!d) return "TBD";
    return formatET(d, withTime);
  }
  