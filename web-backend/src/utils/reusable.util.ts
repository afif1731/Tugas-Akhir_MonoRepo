import crypto from 'node:crypto';

export function createSlug(text: string): string {
  return text
    .trim()
    .replaceAll(/\s+/g, '')
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(/\W/g, '');
}

export function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

export function encryptTextToAES256(text: string, secret: string) {
  const key = deriveKey(secret);

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedString: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag,
  };
}
