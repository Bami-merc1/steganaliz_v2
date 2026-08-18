import type { Lesson } from '../../types/curriculum';

export const WEEK_6_LESSONS: Lesson[] = [
  {
    id: 'w6-sequential-vs-randomized',
    title: 'Sequential vs. Randomized LSB embedding',
    summary: 'Why writing bits in pixel order is the weakest possible choice, and what scattering them buys you.',
    estimatedMinutes: 20,
    content: `
## The weakness built into sequential embedding

Your \`pngLsbEmbed\` engine writes bits **sequentially** - pixel 0's channels first, then pixel 1's, and so on, in raster order, until the payload is exhausted. This is the simplest possible embedding order, and it's also the most detectable, for a specific structural reason: **the flattening effect from Week 5 only occurs in the region that was actually touched.**

If a payload only fills 15% of an image's capacity, sequential embedding means that 15% is concentrated entirely in a **contiguous block at the start** of the pixel stream. A steganalysis tool that runs statistical tests region-by-region (rather than globally across the whole image) will find one sharply anomalous region and many completely untouched, statistically normal regions - which is actually an *easier* detection case than uniform embedding, not a harder one, because the anomaly is spatially concentrated and stands out by contrast with its surroundings.

## The fix: randomized (scattered) embedding

Instead of writing to channels in raster order, a randomized scheme selects **which pixels/channels to use based on a pseudo-random sequence**, derived from a shared secret (a password or key) known to both the embedder and the intended extractor. The payload bits end up spread evenly across the *entire* image rather than concentrated in one region.

\`\`\`
Sequential:  [payload][payload][payload][................unused..................]
Randomized:  [p.....p...p..p......p...p....p..p.....p..p......p...p...p......p..]
             (payload bits scattered pseudo-randomly across the full pixel range)
\`\`\`

This directly defeats region-by-region statistical analysis, and it also raises the bar for chi-square-style attacks: a *low-capacity* randomized payload spreads its flattening effect thinly across the whole image, keeping every local region's statistics closer to natural - whereas the same low-capacity payload embedded sequentially would still produce one small, sharply anomalous region.

## Why "random" must specifically mean cryptographically random

This sets up the next lesson directly: the pseudo-random sequence determining *which* pixels get used must be **reproducible by the extractor** (who needs the exact same sequence to know where to read from) but **unpredictable to anyone without the key** (otherwise an attacker could simply regenerate the same sequence and extract the payload without ever needing the actual password). This dual requirement - reproducible-with-key, unpredictable-without-key - is precisely the definition of a cryptographically secure pseudo-random number generator, which is where the next lesson picks up.

## Check your understanding

- If two different files were embedded with the same password using a randomized scheme, and an attacker had access to both, why might comparing which pixel positions changed between an original and a stego version of the *same* image leak the pseudo-random sequence itself, even without knowing the password? (This is a real, known attack class - known-cover attacks - worth researching if you want to go deeper.)
- Why does randomized embedding not change the total capacity math from Week 5 - it changes *where* bits go, not *how many* can be embedded?
`,
  },
  {
    id: 'w6-csprng',
    title: 'Using Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) to distribute payloads',
    summary: 'What makes a random number generator "cryptographically secure," and how a password becomes a pixel-selection sequence.',
    estimatedMinutes: 25,
    content: `
## Not all randomness is equal

A standard pseudo-random number generator (like \`Math.random()\` in JavaScript) is designed for statistical distribution quality - useful for simulations, games, sampling - but is explicitly **not** designed to resist an adversary trying to predict future or past outputs from observed ones. Many standard PRNGs (including \`Math.random()\`'s underlying algorithm in most JS engines) are **not cryptographically secure**: given enough observed outputs, their internal state can sometimes be reconstructed, allowing all future outputs to be predicted.

A **CSPRNG** (Cryptographically Secure Pseudo-Random Number Generator) is specifically designed so that even with full knowledge of its algorithm and many past outputs, an adversary without the seed/key **cannot** predict future outputs meaningfully better than pure guessing. This is exactly the property randomized LSB embedding needs from the previous lesson: the pixel-selection sequence must be unpredictable to anyone without the shared secret.

## Where you've already used a CSPRNG in this project

Your \`crypto.ts\` already uses one directly:

\`\`\`ts
const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
\`\`\`

\`crypto.getRandomValues()\` is the Web Crypto API's CSPRNG - it's backed by the operating system's own cryptographic random source (on most systems, ultimately fed by hardware entropy: timing jitter, thermal noise, etc.), which is precisely why it's the correct and only appropriate choice here, and why using \`Math.random()\` for salts or IVs would be a genuine, serious security flaw - a well-known category of real-world cryptographic vulnerability.

## From password to pixel sequence: deriving a deterministic-but-secret order

Randomized LSB embedding needs something subtly different from generating a random salt: it needs a sequence that is **deterministic given a password**, so the same password always produces the same pixel order (letting extraction work), while still being **unpredictable without the password**. The standard approach: use the password (via a key-derivation function - recall PBKDF2 from your \`crypto.ts\`, already doing exactly this for AES key derivation) to **seed** a deterministic PRNG algorithm, then use that seeded generator to produce a shuffled sequence of pixel indices.

\`\`\`
password → PBKDF2 (with salt) → derived key/seed
derived seed → seeded PRNG algorithm → deterministic sequence of pixel indices
                                          e.g., [4821, 12, 9934, 501, 7733, ...]
embed/extract bits at exactly these indices, in this exact order
\`\`\`

This is architecturally very close to what your \`crypto.ts\` already does for key derivation - the difference is the derived output is used to *seed a sequence generator* rather than *directly serve as an AES key*. If you were to build this feature, you'd likely reuse \`deriveKey()\`'s PBKDF2 call as the seed source, then feed that seed into a separate seeded-shuffle algorithm (e.g., a Fisher-Yates shuffle driven by the seeded PRNG) to produce the pixel order.

## Why this remains on the roadmap, not yet implemented

Your current \`pngLsbEmbed\`/\`pngLsbExtract\` deliberately use sequential embedding - a reasonable, honest scope choice for this stage of the project, and one worth stating plainly in documentation rather than implying randomized embedding exists when it doesn't. Implementing this well requires care around one subtle correctness issue: the *shuffle sequence itself* must be computed identically on both embed and extract, using pixel/channel counts derived the same way both times - a mismatch here (e.g., if extraction accidentally used a different total-channel-count basis than embedding did) silently produces garbage output rather than a clear error, making this a feature worth testing thoroughly if implemented.

## Check your understanding

- Why is it specifically important that the seed derivation (PBKDF2) includes a salt, even for this pixel-shuffling use case - what would go wrong if the same password always produced the exact same pixel sequence, with no salt involved, across every image ever embedded with that password?
- If an implementation mistakenly used \`Math.random()\` instead of a CSPRNG-seeded approach to shuffle pixel order, would the resulting stego-image still *look* fine to a human? Would it still be exploitable by an attacker who understood the flaw? What's the practical difference between "looks secure" and "is secure" here?
`,
  },
  {
    id: 'w6-pvd',
    title: 'Pixel Value Differencing (PVD) techniques',
    summary: 'An adaptive alternative to fixed-rate LSB that hides more data in busy regions and less in smooth ones.',
    estimatedMinutes: 20,
    content: `
## The limitation LSB shares regardless of sequencing

Both sequential and randomized LSB (as covered so far) embed at a **fixed rate**: always 1 bit per channel (or however many bits-per-channel a variant chooses), regardless of *where* in the image that channel is. But recall from Week 5's check-your-understanding: a change in a low-variance region (a smooth sky) is more statistically conspicuous than the identical change in a high-variance, highly textured region (foliage, fabric patterns, noisy backgrounds) - because natural high-texture regions already have large pixel-to-pixel differences, making a small additional perturbation blend in far better.

**Pixel Value Differencing (PVD)** is a technique built specifically around this insight: rather than embedding a fixed number of bits everywhere, it embeds a **variable** number of bits depending on how much the local pixel values already naturally vary.

## The core mechanism

1. Take pairs of adjacent pixels (rather than treating each pixel independently, as LSB does).
2. Compute the difference \`d\` between them.
3. Classify \`d\` into a range, using a predefined table - small \`d\` (smooth areas) get assigned a narrow range (low embedding capacity), large \`d\` (edges/texture) get assigned a wide range (high embedding capacity).
4. Embed a number of payload bits determined by that range's width, then adjust the pixel pair's actual values so their *new* difference falls within the same range-appropriate bucket that encodes the embedded bits.

\`\`\`
Example range table (simplified):
d in [0,7]     → smooth region  → embed 3 bits
d in [8,15]    → mild texture   → embed 4 bits
d in [16,31]   → edge/texture   → embed 5 bits
d in [32,63]   → strong edge    → embed 6 bits
\`\`\`

A pair of pixels sitting on a sharp edge (large natural difference) can absorb a bigger perturbation without becoming statistically or visually conspicuous, so PVD deliberately embeds more data there - the opposite of LSB's blind, uniform approach.

## Why this matters: capacity AND detection resistance, together

PVD's key advantage over fixed-rate LSB is that it directly incorporates the *content-awareness* your Week 5 check-your-understanding question was gesturing toward - rather than requiring a separate manual decision about where to embed, the algorithm's own difference-classification step naturally routes more data into high-texture regions and less into smooth ones, improving both **capacity** (busy regions can hold more) and **detectability** (perturbations are placed exactly where they're least statistically conspicuous) simultaneously - a genuinely different tradeoff curve than fixed-rate LSB offers.

## Why PVD specifically resists naive chi-square analysis

Recall Week 5's flattening-effect explanation: chi-square analysis assumes a roughly uniform embedding rate to detect the "pairs pushed toward 50/50" signature effectively. PVD's *variable* embedding rate - different numbers of bits in different regions, chosen adaptively rather than uniformly - produces a fundamentally different, less uniform statistical fingerprint than fixed-rate LSB, which is precisely why PVD (and adaptive techniques generally) are considered more advanced and harder to detect with classical statistical tests than naive uniform LSB. This is also why Phase 3 concludes with machine learning approaches (Week 14) - adaptive, content-aware embedding techniques like PVD are exactly the kind of sophisticated method that pushed the field beyond simple, hand-derived statistical tests toward learned feature models.

## Check your understanding

- Why does PVD operate on *pairs* of pixels rather than individual pixels the way LSB does? What information would be lost if you tried to apply PVD's difference-based logic to a single pixel in isolation?
- A steganalysis tool built specifically to detect fixed-rate LSB (like your current \`chiSquareDetector\`) is run against a PVD-embedded image. Based on this lesson, would you expect it to perform as well as it does against LSB? Why or why not - and what does this imply about why real-world steganalysis suites need *multiple, diverse* detectors rather than relying on any single technique?
`,
  },
];