import type { Lesson } from '../../types/curriculum';

export const WEEK_5_LESSONS: Lesson[] = [
  {
    id: 'w5-hvs-color-theory',
    title: 'Human Visual System (HVS) limitations and color theory',
    summary: 'Why the eye can\'t detect a 1-value color shift, and why LSB steganography exploits a real biological limit, not just a math trick.',
    estimatedMinutes: 20,
    content: `
## Steganography isn't just math — it's exploiting biology

Everything from Weeks 1–4 was about *structure*: where bytes live, how formats are organized. Spatial-domain steganography adds a second dimension: it deliberately exploits the limits of **human perception** itself. LSB substitution isn't undetectable because the math is clever — it's imperceptible because of a specific, measurable property of how human eyes process color.

## How a pixel becomes color

A typical image pixel is stored as three 8-bit channels — Red, Green, Blue (RGB) — each ranging 0–255, giving **16,777,216 possible colors** per pixel (256³). A pure red pixel is \`(255, 0, 0)\`; a very slightly darker red is \`(254, 0, 0)\`.

## The Just Noticeable Difference (JND)

Human vision has a measurable threshold called the **Just Noticeable Difference** — the smallest change in a stimulus (here, color intensity) that a person can reliably perceive. Research in visual perception consistently shows that a **single-unit change in an 8-bit color channel (out of 256 levels) falls well below this threshold** under normal viewing conditions. Your eye simply doesn't have the resolving power to distinguish RGB(180, 92, 44) from RGB(181, 92, 44) sitting next to each other, let alone scattered across a full image.

This is the *entire theoretical basis* for LSB substitution's imperceptibility: flipping only the least significant bit of a channel changes its value by **at most 1** (recall the bitwise math from Week 1 — clearing then setting the LSB moves the value by 0 or ±1, never more).

## Why the *human eye* being fooled isn't the same as data being *undetectable*

This is the single most important conceptual distinction of this entire course, and it's worth internalizing now before Phase 3: **LSB substitution defeats human visual inspection, but it does not defeat statistical inspection.** A person looking at a stego-image and a clean image side by side genuinely cannot tell them apart. But the LSB values themselves — even though each individual pixel's change is invisible — follow a statistically different pattern than natural, unmanipulated pixel data does, because natural images have structure and correlation in their LSBs that random (or pseudo-random encrypted) payload data does not.

This is precisely why your project has an entire Detect module and 10-detector steganalysis suite: **the eye is not the adversary a real steganalysis tool cares about.** Chi-square attacks, entropy analysis, RS analysis — everything in Phase 3 — exist because the imperceptibility that fools human vision is a completely different property from statistical indistinguishability, and conflating the two is the single most common misunderstanding beginners have about this field.

## Alpha channel: why your own engine skips it

Recall from your \`pngLsb.ts\`: LSB writes only touch R, G, B channels, explicitly skipping alpha (transparency). This isn't arbitrary — alpha channel changes affect how a pixel *blends* with whatever is behind it, and transparency shifts can be more perceptually salient than color shifts, especially at low-opacity edges or over contrasting backgrounds. Your engine's design decision here is a direct, applied instance of HVS-aware engineering.

## Check your understanding

- If a "high-capacity" LSB variant used the two least significant bits per channel instead of one (allowing a value shift of up to ±3 instead of ±1), would you expect this to still be visually imperceptible? What's the tradeoff being made?
- Why might steganography targeting a channel with naturally *low* variance across an image (e.g., a mostly-blue sky) be more statistically detectable than the same technique applied to a highly-textured, high-variance region?
`,
  },
  {
    id: 'w5-lsb-substitution-algorithm',
    title: 'Least Significant Bit (LSB) substitution algorithms',
    summary: 'The formal algorithm, capacity math, and a full worked trace — annotated against your shipped pngLsb.ts engine.',
    estimatedMinutes: 30,
    content: `
## The algorithm, formally

Given a cover image with \`P\` pixels, each with 3 usable channels (R, G, B — per Week 5's HVS lesson, alpha excluded), and a payload of \`M\` bytes to embed:

**Embedding:**
1. Convert the payload (plus any header/length-prefix framing) to a bitstream.
2. For each bit in the bitstream, in order: take the next available channel value, clear its LSB, set it to the payload bit.
3. Continue until the entire bitstream is written.

**Extraction:**
1. Read channel values in the same order used during embedding.
2. For each channel, extract its LSB (\`value & 1\`).
3. Reassemble the bitstream into bytes.

This is, precisely and completely, what \`pngLsbEmbed\`/\`pngLsbExtract\` implement — you've already built a correct, working reference implementation of the algorithm this lesson describes.

## Capacity: the fundamental formula

\`\`\`
usable_bits = pixel_count × 3        (3 channels per pixel, alpha excluded)
usable_bits -= header_overhead_bits  (your engine: 40 bits — 8-bit flag + 32-bit length)
capacity_bytes = floor(usable_bits / 8)
\`\`\`

This is exactly \`capacityForPixelCount()\` in your codebase. Let's trace it for a concrete image.

## Worked example: a 100×100 pixel image

\`\`\`
pixel_count = 100 × 100 = 10,000
usable_bits = 10,000 × 3 = 30,000
usable_bits (after 40-bit header) = 30,000 − 40 = 29,960
capacity_bytes = floor(29,960 / 8) = 3,745 bytes
\`\`\`

So a 100×100 PNG — a genuinely small image — can hold **3,745 bytes**, roughly 3.7 KB of text, which is several paragraphs. This is worth sitting with: LSB capacity scales with **pixel count**, not file size, which is why a large, highly-compressed JPEG (irrelevant here since JPEG needs Week 7's DCT approach, not raw LSB) can have far fewer usable pixels-worth-of-capacity than a smaller, uncompressed BMP of similar file size.

## The embedding rate, as a percentage

A common way this field expresses capacity is **bits per pixel (bpp)**. Standard 1-bit LSB gives you **3 bits per pixel** (1 bit × 3 channels) — often described as a "3 bpp" embedding rate, or equivalently, roughly **0.375 bytes per pixel**. You'll see in Week 6 how this rate can be pushed higher (more bits per channel) at the direct cost of increasing per-pixel distortion beyond the ±1 shift this lesson established as imperceptible.

## Full worked trace: embedding one character

Embed the letter \`'A'\` (byte value 65, binary \`01000001\`) into the first 8 available R/G/B channel values of an image, assuming (for simplicity) no header framing in this trace:

\`\`\`
Original channel values: 200  201  198  150  151  149  90  91
Payload bits to write:     0    1    0    0    0    0   0   1

Channel 1: 200 (11001000) & 0xfe = 11001000, | 0 = 11001000 = 200 (unchanged)
Channel 2: 201 (11001001) & 0xfe = 11001000, | 1 = 11001001 = 201 (unchanged)
Channel 3: 198 (11000110) & 0xfe = 11000110, | 0 = 11000110 = 198 (unchanged)
Channel 4: 150 (10010110) & 0xfe = 10010110, | 0 = 10010110 = 150 (unchanged)
Channel 5: 151 (10010111) & 0xfe = 10010110, | 0 = 10010110 = 150 (shifted by 1)
Channel 6: 149 (10010101) & 0xfe = 10010100, | 0 = 10010100 = 148 (shifted by 1)
Channel 7:  90 (01011010) & 0xfe = 01011010, | 0 = 01011010 =  90 (unchanged)
Channel 8:  91 (01011011) & 0xfe = 01011010, | 1 = 01011011 =  91 (unchanged)

Resulting channels: 200  201  198  150  150  148  90  91
\`\`\`

Notice: **6 of the 8 channels ended up unchanged**, because their original LSB already happened to match the payload bit being written. Only 2 channels actually shifted, and each shifted by exactly 1. This is a useful intuition to carry forward: **on average, across random payload data, only about half of all touched channels actually change at all** — a fact directly relevant to detection theory in Phase 3, since it means LSB embedding disturbs roughly half the touched pixels' statistical distribution, not all of it.

## Check your understanding

- Using the capacity formula, calculate the byte capacity for a 512×512 pixel image. (Work it out: \`262,144\` pixels × 3 = \`786,432\` bits, minus 40-bit header = \`786,392\`, ÷8 = \`98,299\` bytes — roughly 96 KB.)
- Why does the fact that "only ~50% of touched channels actually change" matter for a detector like the chi-square attack, which specifically measures how *balanced* pairs of adjacent values are?
`,
  },
  {
    id: 'w5-histogram-impact',
    title: 'Mathematical impact of LSB replacement on color histograms',
    summary: 'The precise statistical signature LSB substitution leaves behind — the foundation for every detector in Phase 3.',
    estimatedMinutes: 25,
    content: `
## What a histogram actually shows

A color histogram counts how many pixels have each possible channel value (0–255), for a given channel. Natural, unmanipulated photographic images tend to have **smooth, gradually varying histograms** — the count for value 127 is usually fairly close to the counts for 126 and 128, because natural imagery has correlated, continuous variation (gradients, smooth surfaces, lighting falloff) rather than sharp jumps between exact adjacent values.

## Pairs of Values (PoV): the key insight

Consider adjacent value pairs: (0,1), (2,3), (4,5), ... (254,255). In a **natural, unmodified image**, the counts within each pair are typically *unequal but correlated* — e.g., value 126 might appear 340 times and value 127 might appear 355 times in a given channel's histogram: close, but not forced to be equal, and their difference tends to follow the same smooth gradient as their neighbors.

**LSB substitution fundamentally changes this relationship.** Here's why, formally: when you embed a payload bit into a channel's LSB, you are — from the histogram's perspective — potentially converting an even value into its odd pair partner, or vice versa (e.g., 126 → 127, or 127 → 126), depending only on the payload bit, which for a well-encrypted or naturally text-like payload is **effectively random** (recall from Week 1: encrypted data approaches maximum entropy — its bits are close to a 50/50 coin flip).

The mathematical consequence: **embedding pushes each pair's two values toward being exactly equal in count**, because a random process is redistributing membership between them, regardless of what the *original* natural distribution looked like. This is called the **flattening effect**, and it's the single most important concept in classical steganalysis — it's the entire basis of the chi-square attack you'll formalize mathematically in Week 11, and it's exactly what your \`chiSquareDetector\`'s \`chiSquarePoVScore()\` function is already computing: it measures how close each pair's counts are to a perfect 50/50 split, and treats "suspiciously close to equal" as evidence of tampering.

## A concrete before/after illustration

\`\`\`
BEFORE embedding (natural image, one channel, values 100-105):
Value:  100   101   102   103   104   105
Count:  412   289   398   301   405   295
Pair (100,101): 412 vs 289 — naturally unequal, ratio ≈ 1.43
Pair (102,103): 398 vs 301 — naturally unequal, ratio ≈ 1.32
Pair (104,105): 405 vs 295 — naturally unequal, ratio ≈ 1.37

AFTER LSB embedding a full-capacity random payload:
Value:  100   101   102   103   104   105
Count:  351   350   350   349   350   350
Pair (100,101): 351 vs 350 — nearly equal, ratio ≈ 1.003
Pair (102,103): 350 vs 349 — nearly equal, ratio ≈ 1.003
Pair (104,105): 350 vs 350 — exactly equal, ratio = 1.000
\`\`\`

The *total* count per pair stays essentially the same (embedding doesn't add or remove pixels) — but the *split within* each pair collapses toward 50/50. This is precisely why the chi-square statistic (which measures deviation from an expected 50/50 split, as you saw in your own \`chiSquareDetector\` code) drops sharply for heavily-embedded regions: a **low** chi-square value, counterintuitively, is the suspicious signal here, because it means the data fits the "artificially balanced" null hypothesis too well.

## Why partial embedding is harder to detect than full-capacity embedding

If a payload only fills, say, 10% of an image's capacity, only 10% of channels are touched — meaning 90% of each pair's natural imbalance remains completely intact, diluting the flattening effect across the whole histogram. This is precisely why your verdict engine's weighted, multi-detector approach (rather than relying on chi-square alone) matters in practice: a low-capacity payload might not flatten the histogram enough for chi-square to confidently flag it, but could still be caught by other detectors sensitive to different signal types.

## Check your understanding

- If an attacker deliberately embeds a payload that is *not* random (e.g., structured, highly repetitive data) rather than encrypted, would you expect the flattening effect to be as strong? Why does this explain why your project's Embed panel encourages encryption even beyond confidentiality reasons?
- Sketch (in words) what you'd expect a histogram to look like for an image with LSB payload embedded in *only the first 10% of pixels* (sequential embedding, not scattered) — would chi-square analysis of the *whole image* detect this as easily as one applied per-region? This previews a real weakness of naive global statistical tests that you'll revisit in Phase 3.
`,
  },
];