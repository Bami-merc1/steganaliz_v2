import type { Lesson } from '../../types/curriculum';

export const WEEK_7_LESSONS: Lesson[] = [
  {
    id: 'w7-dct-quantization',
    title: 'Lossy compression pipelines: DCT and quantization matrices',
    summary: 'Why JPEG steganography can\'t use pixel LSB, and what the frequency domain actually is.',
    estimatedMinutes: 30,
    content: `
## Why JPEG breaks the LSB approach entirely

Everything in Weeks 5–6 assumed pixel values are stored directly and survive unchanged when the file is saved - true for PNG/BMP (lossless), false for JPEG. JPEG's compression pipeline **actively discards** information it judges perceptually unimportant, then re-derives approximate pixel values on decode. If you LSB-embed into JPEG's decoded pixel buffer and re-save as JPEG, the compression pass will very likely destroy your embedded bits, since they were never part of what JPEG considers meaningful signal.

## The JPEG pipeline, briefly

\`\`\`
RGB pixels → color space conversion (YCbCr) → split into 8×8 blocks
  → Discrete Cosine Transform (DCT) per block → quantization → entropy coding (Huffman)
\`\`\`

**YCbCr conversion**: separates brightness (Y, luminance) from color (Cb/Cr, chrominance) - because the human eye (per Week 5's HVS lesson) is far more sensitive to brightness changes than color changes, JPEG can compress the color channels more aggressively than the brightness channel without a perceptible quality loss. This is the same "exploit a perceptual limit" principle from Week 5, applied at the compression-engineering level rather than the steganography level.

## The Discrete Cosine Transform (DCT)

DCT converts an 8×8 block of pixel values from the **spatial domain** (values arranged by position) into the **frequency domain** (values representing how much of each spatial frequency pattern is present in that block). The output is 64 **DCT coefficients** per block: one "DC coefficient" (the block's average brightness) and 63 "AC coefficients" representing increasingly fine detail/texture patterns.

This is a genuinely different way of representing the same information - no data is lost by the transform itself (DCT is mathematically reversible on its own) - but it reorganizes the block so that, for typical photographic content, **most of the meaningful signal concentrates in a few low-frequency coefficients**, while many high-frequency coefficients are already close to zero even before any compression happens.

## Quantization: where the actual data loss happens

Each of the 64 coefficients is divided by a corresponding value in a **quantization matrix**, then rounded to the nearest integer. Values in the quantization matrix are larger for high-frequency positions - meaning high-frequency coefficients get divided by bigger numbers, get rounded more aggressively, and frequently round straight to **zero**. This is the actual lossy step: dividing-then-rounding is not reversible - you cannot recover the original coefficient's exact value from its quantized result.

\`\`\`
Original AC coefficient:  23
Quantization value:       16
23 / 16 = 1.4375 → rounds to 1

Decode: 1 × 16 = 16   (not 23 - original precision is permanently lost)
\`\`\`

## Where steganography fits: the quantized coefficients themselves

Transform-domain steganography (Jsteg, F5 - the next lesson) embeds data by manipulating the **quantized DCT coefficients**, *after* quantization but *before* entropy coding - because that's the last point in the pipeline where individual numeric values exist that will survive unchanged all the way to the final file (entropy coding, the final step, is lossless - it just re-encodes the quantized coefficients more compactly, without changing their values). Embed anywhere else in the pipeline, and either the transform or the quantization step will wash your changes out.

## Check your understanding

- Why does it make sense that JPEG's quantization matrix uses *larger* divisors for high-frequency coefficients specifically, rather than uniformly across all 64 positions? (Connect this back to what high-frequency content visually represents - fine detail and edges vs. broad shapes.)
- If DCT itself is mathematically reversible and lossless, why is it still a necessary step in a *lossy* pipeline - what does it enable that couldn't be done directly on raw pixel values?
`,
  },
  {
    id: 'w7-jsteg-f5',
    title: 'Embedding data into quantized DCT coefficients (Jsteg, F5)',
    summary: 'Two real, named algorithms - how they embed, and why one is a substantial statistical improvement over the other.',
    estimatedMinutes: 25,
    content: `
## Jsteg: the direct approach

Jsteg is one of the earliest DCT-domain steganography tools, and its mechanism is a direct translation of Week 5's LSB idea into the frequency domain: **replace the LSB of non-zero, non-DC quantized AC coefficients with payload bits**, skipping coefficients that are 0 or 1 (since flipping those risks producing values that visibly distort the block or collide with reserved encoding patterns).

\`\`\`
Quantized AC coefficients (one 8×8 block): [12, 0, -3, 1, 5, 0, 0, -1, ...]
Skip 0 and ±1 values → usable: [12, -3, 5, ...]
Embed payload bits into their LSBs, same clear-then-set mechanism as pixel LSB
\`\`\`

## Why Jsteg is still statistically detectable

This should feel familiar: Jsteg embedding produces **the exact same flattening effect on coefficient value pairs** that Week 5's histogram lesson described for pixel LSB - because the underlying mechanism (forcing an LSB to match a near-random payload bit) is identical, just applied to a different set of numbers. A chi-square-style attack adapted to analyze DCT coefficient histograms instead of pixel histograms detects Jsteg-embedded JPEGs for precisely the same statistical reason your \`chiSquareDetector\` catches pixel-domain LSB - this is a direct, concrete illustration of why Phase 3's statistical principles generalize across domains, not just across file formats.

## F5: designed specifically to defeat that weakness

F5 (developed by Andreas Westfeld, explicitly as a response to Jsteg's detectability) makes two structural changes:

**1. Matrix embedding**, which reduces the number of coefficients that need to be changed to embed a given payload - fewer changes means a weaker statistical signature, directly trading some efficiency (more coefficients "consumed" per bit conceptually, but fewer actually modified) for detection resistance.

**2. Decrementing instead of LSB-flipping.** Rather than forcing a coefficient's LSB to a specific value (which, as established, flattens the pair distribution), F5 decrements a coefficient's *absolute value* by 1 when the embedded bit doesn't already match its current LSB. Critically, if this decrement would produce 0, F5 **skips that coefficient entirely and tries the next one** (a technique called "shrinkage" avoidance) - because a coefficient going to zero would alter the count of zero-value coefficients in a way that's itself separately statistically detectable (a "shrinkage" signature that earlier, cruder algorithms didn't account for).

\`\`\`
Jsteg:  force LSB directly → coefficient pairs (e.g., 12↔13) flatten toward 50/50
F5:     decrement toward zero, skip if result would be zero →
        avoids the direct flattening signature AND avoids a zero-count anomaly
\`\`\`

## The broader lesson: an arms race, not a solved problem

F5 was, in turn, eventually subject to its own specialized steganalysis techniques (which look specifically for its characteristic decrement-and-skip statistical fingerprint, and for anomalies in the zero-coefficient count it was designed to avoid creating carelessly). This pattern - a new embedding technique defeats existing detectors, prompting new detectors specifically targeting *that* technique's particular statistical fingerprint - is the defining structural fact of this entire field, and it's precisely why your project's Detect module uses a **weighted, multi-detector verdict** rather than any single test: no individual detector generalizes to catch every embedding technique, by the field's own history.

## Check your understanding

- Why does "skip a coefficient rather than let it become zero" meaningfully change F5's statistical fingerprint compared to Jsteg's "always embed here" approach? What specific histogram feature is F5 protecting?
- Given that F5 is more detection-resistant than Jsteg but also more complex to implement correctly, what would you expect the real-world tradeoff to look like for someone choosing between them - is "harder to detect" always the only criterion that matters in practice?
`,
  },
];