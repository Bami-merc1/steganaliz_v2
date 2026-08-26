import type { Lesson } from '../../types/curriculum';

export const WEEK_17_LESSONS: Lesson[] = [
  {
    id: 'w17-hash-fundamentals',
    title: 'Cryptographic hash functions: properties, the avalanche effect, and algorithm history',
    summary: 'What makes a hash function "secure," why MD5 and SHA-1 are broken, and what replaced them.',
    estimatedMinutes: 30,
    content: `
## What a hash function actually is

A **cryptographic hash function** takes an input of *any* size and produces a fixed-size output (a "digest" or "hash") - SHA-256 always produces 256 bits (32 bytes), regardless of whether the input was 3 bytes or 3 gigabytes. This is a one-way, deterministic mapping: same input always produces the same output, but there is no operation that reverses a hash back into its original input - unlike encryption (Weeks 18-19), **hashing has no key and is not meant to be reversed at all**.

## The four properties a *secure* hash function must have

**1. Deterministic.** The same input always produces the same output - a basic requirement for the function to be useful at all (verifying a file's integrity requires re-hashing it and expecting an identical result every time).

**2. Fast to compute.** Given an input, computing its hash should be computationally cheap - this property is essential for legitimate uses (file integrity checks, data structure lookups) but is, notably, the *opposite* of what you want for password storage, which is exactly why Week 17's second lesson introduces a deliberately different, slow category of function.

**3. Pre-image resistance.** Given a hash output \`H\`, it should be computationally infeasible to find *any* input that produces \`H\`. This is what makes a hash function suitable for storing a "fingerprint" of secret data without exposing the secret itself.

**4. Collision resistance.** It should be computationally infeasible to find *two different inputs* that produce the *same* hash output. This matters because a hash function that let an attacker cheaply find two colliding inputs could be exploited to forge a malicious file with the same "fingerprint" as a legitimate one.

## The avalanche effect

A secure hash function exhibits the **avalanche effect**: changing even a single input bit should change roughly half of the output bits, unpredictably. This is what makes hash outputs useless as a *similarity* measure - two nearly-identical files produce completely unrelated hash digests, by design.

\`\`\`
SHA-256("hello")  → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
SHA-256("Hello")  → 185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969
                     ^ one capitalized letter changed → the entire digest is unrelated
\`\`\`

This is a direct structural parallel to something you've already studied: recall Week 5's discussion of LSB steganography and Week 11's chi-square flattening effect - both were about how a *small*, controlled change (flipping one LSB) produces a *small*, statistically detectable footprint. A secure hash function is engineered to guarantee the exact opposite: a small input change must produce a large, unpredictable output change, specifically so that an attacker cannot use "the outputs looked similar" as a lever to reverse-engineer anything about the input.

## The historical arc: MD5 and SHA-1 (broken) vs. SHA-256/SHA-3 (current)

**MD5** (128-bit output, designed 1991): once ubiquitous, now considered **cryptographically broken** - practical collision attacks (finding two different inputs with the same MD5 hash) have been demonstrated and are computationally cheap by modern standards. MD5 remains acceptable for genuinely non-security purposes (a quick checksum to detect accidental corruption, not to defend against a deliberate adversary), but must never be used anywhere collision resistance matters, including any password-related or digital-signature context.

**SHA-1** (160-bit output, designed 1995): also broken - Google and CWI Amsterdam publicly demonstrated a practical SHA-1 collision in 2017 (the "SHAttered" attack), and major browsers and certificate authorities have since deprecated it entirely for TLS certificates.

**SHA-256** (part of the SHA-2 family, 256-bit output): the current, widely-deployed standard. No practical collision or pre-image attacks are known. This is what your own project's PBKDF2 call in \`crypto.ts\` uses as its underlying hash function (\`hash: 'SHA-256'\`), and what secures the vast majority of TLS connections, Bitcoin's proof-of-work, and Git's (older) commit-identification scheme.

**SHA-3** (a structurally *different* design from SHA-2, standardized 2015): developed via an open NIST competition specifically as a hedge against the possibility that some future, unknown attack might weaken SHA-2's underlying design (which shares structural lineage with the already-broken MD5/SHA-1 family). SHA-3 uses a fundamentally different internal construction (a "sponge function," rather than SHA-2's Merkle-Damgard structure) specifically so that a single class of attack is unlikely to threaten both families simultaneously - a deliberate cryptographic diversity strategy, not a claim that SHA-2 is currently weak.

## Why "broken" doesn't mean "the algorithm returns wrong answers"

Worth stating precisely, since this is a common misunderstanding: MD5 and SHA-1 are perfectly deterministic and still compute *a* valid-looking hash for any input, exactly as designed. "Broken" specifically means an adversary can defeat one of the four security properties above (almost always collision resistance first, historically) faster than the brute-force search the algorithm's bit-length would suggest should be necessary. The function still "works" mechanically; it no longer provides the *security guarantee* that made it useful for anything adversarial.

## Check your understanding

- Why does collision resistance matter enormously for digital signatures (previewed here, covered fully in Week 21) specifically, even though a signature scheme never tries to *reverse* a hash back to its input?
- If a hash function had strong pre-image resistance but weak collision resistance, would it still be safe to use for storing a password's fingerprint (ignoring, for now, the slow-hashing requirement from the next lesson)? Reason through what an attacker would actually need to accomplish in each case.
`,
  },
  {
    id: 'w17-password-security-kdfs',
    title: 'Password security: salting, peppering, and Key Derivation Functions',
    summary: 'Why fast hashing is actively dangerous for passwords, and the specific defenses (salts, KDFs, HMAC) built to fix it.',
    estimatedMinutes: 35,
    content: `
## Why "just hash the password" isn't enough

Recall from the previous lesson: cryptographic hash functions are deliberately **fast** - a property that's a genuine asset for file-integrity checking and a genuine liability for password storage. If an attacker steals a database of \`SHA-256(password)\` values, a modern GPU can compute **billions of SHA-256 hashes per second** - meaning every password in a "weak" wordlist (recall your CTF Mode's wordlist brute-forcing feature) can be tested against every stolen hash in a matter of hours, not years.

## Rainbow tables: precomputation as an attack

A **rainbow table** is a precomputed lookup structure mapping common password hashes back to their plaintext originals, built once and reused against *any* stolen hash database that used the same (unsalted) hashing scheme. If two different users both chose the password \`"password123"\`, their stored hashes would be **identical** - meaning cracking one instantly cracks every other account sharing that password, and a sufficiently comprehensive precomputed table can crack a huge fraction of real-world passwords essentially instantly, with zero per-attack computation.

## Salting: defeating precomputation

A **salt** is a random value, unique per user, stored alongside the hash and combined with the password *before* hashing:

\`\`\`
stored_hash = Hash(password + salt)
\`\`\`

Critically, the salt does **not** need to be secret - it's stored in plaintext right next to the hash. Its entire purpose is to guarantee that **two identical passwords produce two different stored hashes**, because their salts differ. This single change defeats rainbow tables completely: precomputing a table would now require a *separate* table per possible salt value, which - given a sufficiently large salt (recall your \`crypto.ts\`'s 32-byte \`SALT_LENGTH_BYTES\`, drawn from a genuine CSPRNG per Week 6's lesson) - is computationally infeasible to precompute for every possible salt in advance.

## Peppering: a second, application-wide secret

A **pepper** is similar in spirit to a salt but with two key differences: it is the **same value across every user** (unlike the per-user salt), and it is kept **secret**, typically stored outside the database entirely (an environment variable, a hardware security module) rather than alongside the hash. Its purpose: even if an attacker steals the entire password-hash database (including every salt), they still cannot mount an offline cracking attack without also separately compromising the pepper - it adds a genuinely independent barrier, since a database breach alone doesn't leak it. Peppering is a defense-in-depth addition on top of salting, not a replacement for it.

## The real fix: Key Derivation Functions (KDFs) - deliberately slow hashing

Salting solves the *precomputation* problem but does nothing about *raw hashing speed* - an attacker with a stolen, salted hash can still brute-force it at billions of attempts per second per hash. **Key Derivation Functions** solve this by being **deliberately, tunably slow** - the opposite design goal from a general-purpose hash function like SHA-256.

**PBKDF2** (Password-Based Key Derivation Function 2): repeatedly re-applies an underlying hash function (commonly HMAC-SHA256) thousands to hundreds of thousands of times, directly multiplying the computational cost of each guess by the iteration count. This is **exactly** what your own \`crypto.ts\` implements:

\`\`\`ts
const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
return crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
  baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
);
\`\`\`

310,000 iterations means an attacker's brute-force cost is roughly 310,000× higher per guess than a single raw SHA-256 call - directly, deliberately trading legitimate-user convenience (a fraction of a second's delay) for a massive multiplier against offline attackers. This is precisely the OWASP-recommended iteration count referenced throughout your project's documentation and Terms modal.

**bcrypt**: an older (1999), widely-deployed, purpose-built password-hashing algorithm with a tunable "cost factor" controlling iteration count, similar in spirit to PBKDF2 but built around the Blowfish cipher's internals rather than a generic hash-iteration wrapper. Notably, bcrypt's memory usage is small and fixed - a limitation the next algorithm was designed specifically to address.

**Argon2**: the current state-of-the-art, and winner of the 2015 Password Hashing Competition. Argon2's key innovation over PBKDF2/bcrypt is **deliberate memory-hardness** - it's tunable not just for CPU time but for RAM usage, specifically because specialized cracking hardware (GPUs, ASICs) achieves its massive speed advantage largely through *parallelism*, and parallelism is sharply limited when each parallel attempt also requires a large, independent chunk of memory. This makes Argon2 meaningfully more resistant to large-scale parallel cracking than PBKDF2, for equivalent CPU-time cost.

## HMAC: authenticity, not password storage

**HMAC (Hash-based Message Authentication Code)** solves a related but distinct problem from password storage: **proving a message hasn't been tampered with, and that it genuinely came from someone holding a shared secret key.** Mechanically, HMAC combines a secret key with the message through a specific, carefully-designed double-hashing construction (not simply \`Hash(key + message)\`, which has known structural weaknesses) - and the recipient, holding the same secret key, can recompute the HMAC and compare.

\`\`\`
HMAC(key, message) = Hash( (key XOR opad) || Hash( (key XOR ipad) || message ) )
\`\`\`

(The exact construction's details are less important here than the takeaway: HMAC is a **keyed** hash, giving it a security property plain hashing lacks entirely - without the key, an attacker cannot forge a valid HMAC for a *modified* message, even knowing the underlying hash algorithm perfectly.) This is precisely why PBKDF2 itself is built on **HMAC**-SHA256 internally, not raw SHA-256 - PBKDF2 needs a keyed pseudorandom function as its core building block for its own security proof to hold, and HMAC is the standard, well-analyzed choice for that role. You'll meet HMAC again in Week 19's discussion of authenticated encryption, where GCM mode provides a conceptually similar tamper-evidence guarantee via a different mechanism (an authentication tag) built into the cipher mode itself.

## Check your understanding

- Why is a salt safe to store in plaintext right next to the hash, while a pepper specifically needs to be kept secret and stored separately? What attack does each one specifically defend against, and why does that difference in threat model justify the difference in secrecy requirement?
- Given that your project's \`crypto.ts\` uses PBKDF2 rather than Argon2, what would be the concrete security argument for migrating to Argon2 in a future revision - and what would be the practical cost of doing so, given that PBKDF2 already has native, dependency-free support via the Web Crypto API while Argon2 does not?
`,
  },
];
