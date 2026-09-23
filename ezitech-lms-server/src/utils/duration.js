const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

function durationToMs(value, fallbackMs) {
  const match = /^\s*(\d+)\s*([smhdw])\s*$/i.exec(String(value));
  if (!match) return fallbackMs;
  return parseInt(match[1], 10) * UNIT_MS[match[2].toLowerCase()];
}

module.exports = { durationToMs };
