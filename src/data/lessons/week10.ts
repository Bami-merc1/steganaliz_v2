import type { Lesson } from '../../types/curriculum';

export const WEEK_10_LESSONS: Lesson[] = [
  {
    id: 'w10-bitplane-analysis',
    title: 'Bitplane isolation and analysis',
    summary: 'Making the invisible visible - literally extracting and viewing an image\'s LSB layer.',
    estimatedMinutes: 25,
    content: `
## Phase 3 begins: from theory to detection practice

Weeks 5–9 covered how data gets hidden. Phase 3 covers how it gets found. This first lesson introduces the single most intuitive, visually direct steganalysis technique - one that requires no statistics at all, just a different way of looking at the same pixel data your \`pngLsbEmbed\` engine already manipulates.

## What a bitplane is

Recall a pixel channel value is an 8-bit number (Week 1). A **bitplane** is the set of *just one specific bit position*, extracted from every pixel in the image, and displayed as its own separate black-and-white image - bit=1 renders as white, bit=0 as black (or vice versa).

An 8-bit channel has 8 bitplanes: the **most significant bitplane** (bit 7) carries the bulk of an image's actual visual structure - a recognizable, though contrast-reduced, silhouette of the original image. The **least significant bitplane** (bit 0) - precisely the one LSB steganography writes to - normally looks like essentially **pure visual noise** in a natural, unmanipulated image, because natural pixel data's LSBs don't correlate strongly with anything visually meaningful.

\`\`\`
Bitplane 7 (MSB): clearly recognizable image structure
Bitplane 6:        still recognizable, somewhat noisier
Bitplane 5:        increasingly noise-like
...
Bitplane 0 (LSB):  pure noise in a natural image
\`\`\`

## The visual attack: why this catches naive sequential LSB specifically

Here's the direct connection to Week 6's sequential-vs-randomized lesson: if a payload is embedded **sequentially** (as your current \`pngLsbEmbed\` does) and doesn't fill the image's entire capacity, isolating and viewing bitplane 0 reveals something visually striking - a **sharp, geometric boundary** between a region of dense, structured-looking noise (where the payload was written) and a region of the LSB plane's normal, unstructured noise (the untouched remainder). Payload data - especially encrypted payload data, which per Week 1 approaches maximum entropy - has a *different visual texture* in the LSB plane than natural image noise does, and critically, it's **spatially confined** to exactly the region that was written to, creating a visible edge a human eye can spot immediately, with zero statistical computation required.

\`\`\`
Bitplane 0 of a natural image:          uniform, unstructured noise throughout
Bitplane 0 of a sequentially-embedded
image (payload fills 20% of capacity):  [structured-looking region][uniform noise region]
                                          ^ payload here, visually distinct ^
\`\`\`

This is precisely the weakness your Week 6 check-your-understanding question anticipated: sequential embedding creates a spatially concentrated anomaly, and bitplane isolation is the most direct possible way to expose that concentration - no chi-square math needed, just isolating one bit position and looking at it.

## Why randomized embedding (Week 6) specifically defeats this attack

If payload bits are scattered pseudo-randomly across the entire image (rather than written sequentially), the LSB plane's "structured-looking payload region" gets spread thinly and evenly across the whole plane instead of concentrated in one visually distinct area - there's no sharp edge for the human eye to notice, because there's no *spatial concentration* left to see. This is a clean, concrete illustration of exactly why Week 6 introduced randomized embedding as a meaningful improvement: it's not just a statistical hedge against chi-square-style tests, it's a direct, specific defeat of this exact visual attack.

## Practical implementation approach

Extracting a bitplane from image data is mechanically simple, and directly reuses logic your codebase already has: for each pixel channel value, compute \`(value >> n) & 1\` (Week 1's bit-shift-then-mask pattern) for the target bit position \`n\`, then render the result as pure black or white. This is almost the same operation as \`pngLsbExtract\`'s \`data[i + c] & 1\` line - the difference is purely intent: extraction reads the LSB plane to *recover a payload*; bitplane analysis reads it (any bit position, not just LSB) to *visualize its statistical texture*, without attempting to decode anything as a message.

## Check your understanding

- Why does isolating bitplane 7 (MSB) rather than bitplane 0 (LSB) reveal a recognizable image, while bitplane 0 typically doesn't, even in a completely clean, unmanipulated photo?
- If an attacker wanted to defeat bitplane-visual-analysis specifically, without going as far as full randomized embedding, could partially filling the image to 100% capacity (rather than a low percentage) help? What would the resulting bitplane 0 look like, and why might full-capacity embedding paradoxically be *harder* to spot visually than low-capacity embedding, despite typically being easier to catch via other statistical means?
`,
  },
  {
    id: 'w10-entropy-artifacts',
    title: 'Identifying artificial entropy blocks in natural images',
    summary: 'Formalizing "structured-looking noise" from the previous lesson into a measurable, regional statistic.',
    estimatedMinutes: 20,
    content: `
## From "looks different" to "measurably different"

The previous lesson relied on human visual judgment - "this region looks noisier/more structured than that region." This lesson formalizes that intuition using **local entropy**, directly building on Week 1's Shannon entropy concept (which your own \`entropyDetector\` already computes, but currently only as a single global score for the entire file).

## Why global entropy misses regional anomalies

Recall your \`entropyDetector\`: it computes one Shannon entropy value across the **entire file's byte distribution**. This works reasonably well for detecting a file that's *globally* high-entropy (e.g., because it's mostly encrypted payload relative to its total size) - but per the sequential-embedding scenario from the previous lesson, a payload filling only 15–20% of an image's capacity won't push the *global* entropy figure dramatically, because 80%+ of the file's bytes remain completely natural and untouched. This is precisely the detection gap Week 5's final check-your-understanding question flagged.

## The fix: block-based (regional) entropy analysis

Rather than one entropy value for the whole image, compute entropy **separately for small regions** (e.g., 16×16 or 32×32 pixel blocks), then compare each block's entropy against its neighbors and against the image's overall baseline.

\`\`\`
For each block in the image:
  compute Shannon entropy of that block's LSB values (or full pixel values)
  compare against expected/neighboring entropy

A natural image:        entropy varies smoothly and moderately between adjacent blocks
                         (following the image's own natural content - a sky block has
                         different entropy than a foliage block, but the transition is gradual)

A sequentially-embedded
image:                   sharp entropy discontinuity exactly at the boundary between
                         "payload written here" and "untouched" regions
\`\`\`

This is a direct statistical formalization of the bitplane visual attack - instead of a human eye spotting a boundary, a program computes an entropy value per block and flags blocks (or boundaries between blocks) whose entropy is anomalously high, or whose entropy differs sharply from immediately adjacent blocks in a way natural image content doesn't typically produce.

## Why this remains vulnerable to the same defeat as bitplane analysis

Exactly like the previous lesson: randomized, scattered embedding (Week 6) defeats block-based entropy analysis for the same underlying reason it defeats bitplane visual inspection - if payload bits are spread evenly across the entire image rather than concentrated in one region, **every block** receives a small, roughly equal share of the embedding's entropy contribution, rather than a few blocks receiving a large, concentrated share. The resulting entropy landscape stays comparatively smooth and doesn't produce a sharp regional discontinuity for this technique to catch. This is a recurring, important pattern worth naming explicitly: **regional/spatial detection techniques (this lesson and the previous one) are specifically strong against sequential embedding and specifically weak against randomized embedding** - while global techniques (your current \`entropyDetector\`, chi-square applied globally) have the *opposite* profile: weaker against low-capacity sequential embedding (diluted by untouched regions), but equally effective whether the embedding is sequential or randomized, since they don't care about spatial position at all, only overall statistical distribution.

## Why a real verdict engine needs both kinds of detector

This complementary weakness/strength pattern is the strongest concrete justification yet for your project's weighted, multi-detector \`computeVerdict()\` architecture: no single detector category (global-statistical vs. regional-spatial) covers every embedding strategy an adversary might choose, and a thorough steganalysis suite needs representatives of *both* categories specifically because their blind spots don't overlap.

## Check your understanding

- Given the complementary strengths/weaknesses described above, sketch how you'd expect a *low-capacity, sequentially-embedded* image to score across: (a) your existing global \`entropyDetector\`, (b) a hypothetical block-based regional entropy detector. Which would likely catch it more reliably, and why?
- Why might natural images with intentionally sharp content boundaries (e.g., a photo with a hard edge between a bright sky and a dark silhouette) present a genuine false-positive risk for block-based entropy analysis, even with no steganography involved at all?
`,
  },
];