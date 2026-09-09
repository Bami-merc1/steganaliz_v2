// Client-side zero-knowledge encryption for workspace entries.
// The workspace key is derived from the user's password in the browser.
// The server never receives anything that can be used to derive this key.

const PBKDF2_ITERATIONS = 200_000;
const WORKSPACE_INFO    = 'stgz-workspace-key-v1'; // domain separation from auth

async function deriveWorkspaceKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc     = new TextEncoder();
  const salt    = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password + WORKSPACE_INFO), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encryptWorkspaceEntry(
  data: object,
  password: string,
  workspaceSalt: string
): Promise<{ encryptedBlob: string; iv: string; salt: string }> {
  const key       = await deriveWorkspaceKey(password, workspaceSalt);
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource        // <-- cast to BufferSource, not Uint8Array<ArrayBufferLike>
  );

  // Copy into a fresh Uint8Array<ArrayBuffer> — same fix as pdfEmbed/pngRandomized
  const ciphertext = new Uint8Array(ciphertextBuffer.byteLength);
  ciphertext.set(new Uint8Array(ciphertextBuffer));

  return {
    encryptedBlob: toB64(ciphertext),
    iv:   toB64(iv),
    salt: workspaceSalt,
  };
}

export async function decryptWorkspaceEntry<T = unknown>(
  encryptedBlob: string,
  iv: string,
  salt: string,
  password: string
): Promise<T> {
  const key        = await deriveWorkspaceKey(password, salt);
  const ciphertext = fromB64(encryptedBlob);
  const ivBytes    = fromB64(iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as BufferSource },
    key,
    ciphertext as BufferSource       // <-- cast here
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}