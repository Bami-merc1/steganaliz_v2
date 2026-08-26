import type { Lesson } from '../../types/curriculum';

export const WEEK_18_LESSONS: Lesson[] = [
  {
    id: 'w18-classical-ciphers',
    title: 'Classical ciphers: Caesar and Vigenère, and exactly why they fail',
    summary: 'The historical starting point for symmetric encryption, and the specific statistical weaknesses that make both breakable by hand.',
    estimatedMinutes: 25,
    content: `
## Why study broken ciphers at all

Every classical cipher in this lesson is trivially breakable by modern standards - but studying *why* each one fails builds the exact intuition needed to appreciate what AES (Week 19) does differently, and it directly echoes this course's Phase 3 theme: **understanding a weak, classical mechanism deeply is what lets you recognize the same weakness's fingerprint elsewhere.**

## The Caesar cipher: a substitution shift

Each letter is shifted a fixed number of positions through the alphabet. A shift of 3: \`A→D, B→E, ... Z→C\`.

\`\`\`
Plaintext:  H E L L O
Shift +3:   K H O O R
\`\`\`

**Why it fails immediately:** there are only **25 possible shift values** (26 minus the no-op shift of 0). An attacker can simply try all 25 shifts and read off the one that produces meaningful text - a brute-force search so small it can be done by hand in minutes. This is the most extreme possible illustration of an **insufficient key space**: the "key" (the shift amount) has so few possible values that exhaustive search isn't even a meaningful barrier.

## The Vigenère cipher: a repeating-key improvement

Vigenère extends Caesar by using a **repeating keyword** rather than a single fixed shift - each letter of the plaintext is shifted by the corresponding letter of the keyword, cycling the keyword as needed.

\`\`\`
Plaintext:  A T T A C K A T D A W N
Keyword:    L E M O N L E M O N L E   (repeated to match length)
Ciphertext: L X F O P V E F R N H R
\`\`\`

This defeats simple brute-force shift-search (now there are 26^(keyword length) possible keys, not just 25) - but it has a **structural** weakness Caesar doesn't even get the chance to exhibit: **the key repeats**. Because the same keyword letter re-encrypts the plaintext at regular intervals (every \`keyword_length\` characters), any statistical pattern in the plaintext that happens to align with that repetition period leaves a detectable fingerprint in the ciphertext.

## The Kasiski examination: breaking Vigenère via repetition

If the same plaintext substring happens to appear at two positions separated by a multiple of the keyword's length, it will produce the **same ciphertext substring** both times (since the same keyword letters line up with it both times). An analyst (originally Friedrich Kasiski, in 1863) can scan ciphertext for repeated substrings, measure the distances between repetitions, and take the greatest common divisor of those distances - which reliably reveals the keyword's length. Once the length is known, the ciphertext can be split into that many separate, *interleaved* Caesar-cipher streams (since each position within the repeating keyword behaves like its own fixed Caesar shift), and each stream can be cracked independently using simple frequency analysis (comparing observed letter frequencies against known English-language letter frequencies - 'E' is the most common letter in English text, and this shows up statistically even after a Caesar shift, just shifted itself).

## The deep, generalizable lesson: key reuse and periodicity are the enemy

This is worth connecting explicitly to material you already know. Recall **Week 5's flattening effect** and **Week 11's chi-square attack**: both exploit a *statistical regularity* that a manipulation process leaves behind, even when the manipulation is individually invisible. Kasiski's attack on Vigenère is the *exact same category of reasoning*, just applied to text rather than pixels: **any process that repeats a pattern at a predictable interval leaves a detectable statistical signature, regardless of the domain.** This single insight - "reused or periodic secrets are structurally weak, no matter how the reuse manifests" - is the direct ancestor of a rule you'll see stated explicitly and repeatedly for the rest of this phase: **never reuse a key or an IV/nonce** (Week 19), and **Diffie-Hellman's entire design (Week 20) exists partly to let two parties generate a *fresh* shared secret for every session, rather than reusing one indefinitely.**

## Why classical ciphers are unconditionally insecure regardless of key length

It's worth being precise about *why* modern cryptography abandoned this entire family of design, rather than simply using longer keywords: Caesar and Vigenère are both **substitution ciphers operating directly on natural-language letter frequencies**, meaning the *plaintext's own statistical structure* (some letters common, some rare; certain letter pairs common, others vanishingly rare) survives through the encryption process in a disguised but still-exploitable form. No key length fixes this, because the weakness isn't "the key space is too small" - it's that **the cipher doesn't sufficiently scramble the statistical relationship between plaintext and ciphertext at all**, a property modern block ciphers are specifically engineered to eliminate (Week 19's discussion of "confusion and diffusion").

## Check your understanding

- If a Vigenère keyword were made exactly as long as the plaintext itself, and used only once, never reused for any other message - what would happen to the Kasiski examination's core assumption? (This is, not coincidentally, a direct preview of the next lesson's topic.)
- Why does frequency analysis work against a single Caesar shift, but require first defeating the keyword-length problem before it can be applied to Vigenère ciphertext directly?
`,
  },
  {
    id: 'w18-otp-stream-vs-block',
    title: 'The One-Time Pad and the stream cipher vs. block cipher distinction',
    summary: 'The only mathematically unbreakable cipher, why it\'s almost never practical, and the two families of modern cipher it inspired.',
    estimatedMinutes: 30,
    content: `
## Answering the previous lesson's final question

If a Vigenère-style key is exactly as long as the plaintext, truly random (not a memorable word or phrase), and never reused for any other message, something remarkable happens: **Kasiski's examination has nothing to find**, because there is no repetition at all - the key never cycles. This construction has a name: the **One-Time Pad (OTP)**.

## The One-Time Pad: provably, mathematically unbreakable

An OTP combines plaintext with a truly random key of **equal length**, using XOR (recall this lesson's Week 16 opening):

\`\`\`
ciphertext = plaintext XOR key   (key is truly random, same length as plaintext, used exactly once)
\`\`\`

Claude Shannon proved in 1949 that a properly-used OTP achieves **perfect secrecy**: given the ciphertext alone, with no knowledge of the key, **every possible plaintext of that length is equally likely** - an attacker with unlimited computational power, even literally trying every possible key, gains *zero* information about which plaintext is correct, because every key produces a *different, equally plausible* plaintext. This is a fundamentally different and stronger guarantee than "computationally infeasible to break" (which is all AES or RSA claim) - it's **unconditional security**, true regardless of any future advance in computing power, including quantum computers.

## Why the OTP is almost never used in practice

The catch is entirely in the fine print of "properly used," and each requirement is a severe practical burden:

**1. The key must be truly random** - not a password, not a pseudorandom generator's output, but genuine entropy (recall Week 6's CSPRNG lesson) equal in length to the entire message.

**2. The key must be exactly as long as the plaintext.** For a 1 GB file, you need a full 1 GB of pre-shared random key material - meaning the key-distribution problem is at least as hard as the original problem of securely transmitting the message itself.

**3. The key must never be reused**, for any message, ever. Reuse catastrophically breaks the perfect-secrecy guarantee: XOR-ing two ciphertexts that share a key cancels the key out entirely (\`C1 XOR C2 = P1 XOR P2\`), leaking a direct statistical relationship between the two plaintexts - precisely the same class of "reused secret leaks structure" failure from Vigenère, just at a starker, more direct level. This specific, historically real mistake - reusing OTP key material - is what allowed Allied cryptanalysts to partially break supposedly "unbreakable" Soviet Venona-project traffic in the 1940s.

Given these constraints, an OTP requires securely pre-sharing a key at least as large as every message you'll ever want to send, in advance, once, never reused - which is why, outside a small number of extremely high-stakes, low-volume use cases (historically, diplomatic and intelligence communications), it's impractical for virtually everything modern cryptography needs to secure.

## The OTP's legacy: it defines the *goal*, even where it can't be the *implementation*

Every modern symmetric cipher can be understood as attempting to approximate the OTP's guarantee using a much **shorter**, reusable key - accepting *computational* security (infeasible to break with realistic resources) in exchange for practicality, rather than the OTP's *unconditional* security. This reframes the rest of this phase usefully: **AES is not a different idea from the OTP - it's an engineering compromise that trades perfect secrecy for a practical, short, reusable key**, achieved by using the key to *deterministically generate* something that behaves statistically like a random keystream (a **stream cipher**), or by processing data through a complex, fixed, keyed transformation applied to fixed-size chunks (a **block cipher**, which Week 19 covers as AES specifically).

## Stream ciphers: OTP's practical descendant

A **stream cipher** generates a long, deterministic pseudorandom keystream from a short key (and typically a nonce - a number used once, to ensure the same key produces a *different* keystream for each message, directly addressing the OTP's reuse problem without needing a full-message-length key), then XORs that keystream against the plaintext, exactly like an OTP:

\`\`\`
keystream = PRG(key, nonce)          (deterministic, but computationally indistinguishable from random)
ciphertext = plaintext XOR keystream
\`\`\`

**ChaCha20** (used widely in modern TLS and, notably, by Signal and WireGuard) is a well-regarded, current stream cipher. Stream ciphers process data continuously, one bit or byte at a time, without needing to buffer it into fixed-size chunks - well suited to real-time or variable-length data streams.

## Block ciphers: the alternative family

A **block cipher** instead processes data in **fixed-size chunks** (AES uses 128-bit/16-byte blocks), applying a complex, keyed, invertible transformation to each block independently. Unlike a stream cipher, a block cipher's core operation isn't "XOR against a keystream" - it's a much more elaborate, structured scrambling (Week 19 covers AES's internals: substitution boxes, permutation layers, multiple rounds). Block ciphers require a **mode of operation** (also Week 19) to sensibly handle messages longer or shorter than one block - a genuinely important, separate design decision from the block cipher itself, and the source of real, historically damaging vulnerabilities when chosen incorrectly (ECB mode, previewed in the next lesson).

## Why your project uses a block cipher (AES-GCM), not a stream cipher

Your \`crypto.ts\` uses \`AES-GCM\` specifically - a block cipher (AES) combined with a mode of operation (GCM) that internally behaves somewhat like a stream cipher for the actual encryption step, while additionally providing built-in tamper-detection (an authentication tag) that a bare stream cipher does not. This hybrid nature - block cipher core, stream-cipher-like counter-mode operation, plus authentication - is exactly why GCM is considered a strong default choice for general-purpose application encryption, and it's the direct subject of the next lesson.

## Check your understanding

- Given Shannon's perfect-secrecy proof, why can no algorithm using a key *shorter* than the message ever achieve true OTP-level unconditional security, no matter how cleverly designed - and why does this mean every practical cipher (AES included) is fundamentally a *computational* security bet, not an unconditional one?
- Why does a stream cipher's nonce need to be unique per message with the same key, but not necessarily secret - what specifically breaks if two different messages, encrypted under the same key, accidentally reuse the same nonce?
`,
  },
];
