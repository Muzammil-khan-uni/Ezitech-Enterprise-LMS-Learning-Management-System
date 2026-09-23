const crypto = require('crypto');
const env = require('../config/env');

const PREFIX = 'enc:v1:';

function key() {
  return crypto.createHash('sha256').update(env.mfaEncryptionKey).digest();
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${[iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.')}`;
}

function decrypt(stored) {
  if (!isEncrypted(stored)) return stored;
  const [iv, tag, ciphertext] = stored
    .slice(PREFIX.length)
    .split('.')
    .map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt, isEncrypted };
