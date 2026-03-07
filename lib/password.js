const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

var KEY_LENGTH = 64;

function hashPassword(password) {
  var raw = String(password || "");
  if (!raw) throw new Error("Password is required");
  var salt = randomBytes(16).toString("hex");
  var hash = scryptSync(raw, salt, KEY_LENGTH).toString("hex");
  return ["scrypt", salt, hash].join(":");
}

function verifyPassword(password, storedHash) {
  var raw = String(password || "");
  var stored = String(storedHash || "");
  var parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  var salt = parts[1];
  var expected = Buffer.from(parts[2], "hex");
  var actual = scryptSync(raw, salt, KEY_LENGTH);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

module.exports = {
  hashPassword,
  verifyPassword
};
