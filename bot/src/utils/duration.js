// Parses simple duration strings like "30m", "2h", "1d", "1w" into milliseconds.
// Shared by /giveaway and /poll, both of which need "how long should this run".
export function parseDuration(input) {
  const match = (input || "").trim().match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return num * multipliers[match[2].toLowerCase()];
}
