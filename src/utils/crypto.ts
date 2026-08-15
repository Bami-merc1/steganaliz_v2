const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(
  plaintext: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const key = await deriveKey(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  const framed = new Uint8Array(salt.length + iv.length + ciphertext.length);
  framed.set(salt, 0);
  framed.set(iv, salt.length);
  framed.set(ciphertext, salt.length + iv.length);
  return framed;
}

export async function decryptPayload(
  framed: Uint8Array,
  password: string
): Promise<Uint8Array> {
  if (framed.length < SALT_LENGTH_BYTES + IV_LENGTH_BYTES) {
    throw new Error('Encrypted payload is malformed or truncated.');
  }

  const salt = framed.slice(0, SALT_LENGTH_BYTES);
  const iv = framed.slice(SALT_LENGTH_BYTES, SALT_LENGTH_BYTES + IV_LENGTH_BYTES);
  const ciphertext = framed.slice(SALT_LENGTH_BYTES + IV_LENGTH_BYTES);
  const key = await deriveKey(password, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return new Uint8Array(plaintextBuffer);
  } catch {
    const delay = 150 + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delay));
    throw new Error(
      'Decryption failed. Incorrect password, or the file does not contain a valid encrypted payload.'
    );
  }
}

export function estimatePasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const varietyScore = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (password.length >= 12 && varietyScore >= 3) return 'strong';
  if (password.length >= 8 && varietyScore >= 2) return 'fair';
  return 'weak';
}