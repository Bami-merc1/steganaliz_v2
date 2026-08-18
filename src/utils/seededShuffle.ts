// Derives a seeded, deterministic pseudo-random sequence from a password -
// NOT cryptographically secure on its own (this is a seeded PRNG, not a
// CSPRNG), but the SEED itself comes from PBKDF2 (genuinely CSPRNG-backed
// key derivation, same as crypto.ts), which is what actually protects it
// from being guessed. This mirrors Week 6's lesson: the seed derivation
// needs to be secure; the shuffle algorithm just needs to be deterministic.

async function deriveSeed(password: string, salt: Uint8Array): Promise<number> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    32 // 32 bits - enough entropy to seed a PRNG; the real security lives in PBKDF2's iteration count, not this width
  );
  return new DataView(derivedBits).getUint32(0, false);
}

// A simple, fast, deterministic PRNG (mulberry32) - NOT for cryptographic
// use on its own. Its only job here is to deterministically reproduce the
// same sequence given the same seed, so embed and extract agree.
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, driven by the seeded PRNG - produces a deterministic
// permutation of [0, 1, ..., count-1].
function seededPermutation(count: number, rng: () => number): Uint32Array {
  const indices = new Uint32Array(count);
  for (let i = 0; i < count; i++) indices[i] = i;

  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices;
}

export async function derivePixelOrder(
  password: string,
  salt: Uint8Array,
  usableChannelCount: number
): Promise<Uint32Array> {
  const seed = await deriveSeed(password, salt);
  const rng = mulberry32(seed);
  return seededPermutation(usableChannelCount, rng);
}