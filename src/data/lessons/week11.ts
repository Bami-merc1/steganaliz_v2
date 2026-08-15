import type { Lesson } from '../../types/curriculum';

export const WEEK_11_LESSONS: Lesson[] = [
  {
    id: 'w11-pov-flattening-formal',
    title: 'Pairs of Values (PoVs) in binary sets — the formal model',
    summary: 'Revisiting Week 5\'s flattening effect with full mathematical rigor, as a foundation for the chi-square test itself.',
    estimatedMinutes: 20,
    content: `
## From intuition to formal statistical model

Week 5 introduced the flattening effect intuitively, with a worked before/after example. This lesson formalizes it as the actual statistical model the chi-square attack is built on — the exact model your \`chiSquareDetector\` implements in code.

## The formal PoV structure

Partition the value range 0–255 into 128 adjacent pairs: \`(0,1), (2,3), (4,5), ..., (254,255)\`. For each pair \`(2k, 2k+1)\`, define:

\`\`\`
n_2k    = count of pixels with value exactly 2k
n_2k+1  = count of pixels with value exactly 2k+1
\`\`\`

**The null hypothesis for LSB-embedded data**: if a pixel's LSB has been overwritten with a random bit (as happens under full-capacity LSB embedding with encrypted payload), then for any given pair, a pixel that originally had *either* value \`2k\` or \`2k+1\` now has a 50% chance of ending up as \`2k\` and a 50% chance of ending up as \`2k+1\`, **regardless of which one it originally was** — because the embedding process discards the original LSB entirely and replaces it with an independent random bit.

This means: under this null hypothesis, the *expected* count for each half of the pair is:

\`\`\`
expected = (n_2k + n_2k+1) / 2
\`\`\`

— exactly the formula your \`chiSquarePoVScore()\` function computes as \`expected\`.

## Why this expected-value formula doesn't depend on the original distribution

This is the elegant core of the technique: notice the formula for \`expected\` only uses the **sum** of the pair's counts, never their individual original values. This means the test doesn't need to know anything about what the image's *natural* histogram should look like (which would vary wildly image to image) — it only needs to check whether the *split within* each pair, whatever the pair's total, is suspiciously close to 50/50. This is precisely why chi-square analysis works as a general-purpose test across arbitrary natural images, rather than needing image-specific calibration.

## Bridging to Week 11's main topic

With \`observed\` (the actual \`n_2k\` and \`n_2k+1\` counts) and \`expected\` (both halves' shared average) now formally defined, the next lesson introduces the actual chi-square goodness-of-fit statistic that measures *how far* the observed counts deviate from this expected 50/50 split — turning "looks suspiciously equal" into a precise, computable number with well-understood statistical properties.

## Check your understanding

- Why does the null hypothesis specifically require the payload bit to be *independent* of the original LSB value — what would happen to the whole model's validity if payload bits were instead, say, always set to match some property of the pixel's own position (not independent/random at all)?
- If an image's pair \`(100, 101)\` originally had counts \`n_100 = 500, n_101 = 10\` (a heavily skewed natural pair — perhaps a mostly-uniform-color region), what would \`expected\` be under full embedding, and how dramatically would that differ from the pair's *original* skewed distribution? What does this suggest about which kinds of images (skewed vs. naturally balanced histograms) might show the *starkest* chi-square signal after embedding?
`,
  },
  {
    id: 'w11-chi-square-test',
    title: 'The Chi-Square (χ²) goodness-of-fit test applied to media fields',
    summary: 'The actual statistic, its interpretation, and a full annotated walkthrough of your shipped chiSquareDetector.',
    estimatedMinutes: 30,
    content: `
## The chi-square statistic, formally

For each pair, compare observed vs. expected counts using the standard chi-square goodness-of-fit formula:

\`\`\`
χ² = Σ [ (observed − expected)² / expected ]
\`\`\`

summed across both values in each pair, then typically summed or averaged across all 128 pairs in the channel being analyzed.

## Interpreting the result — and why LOW is suspicious here

This is the single most counterintuitive part of this whole technique, worth stating explicitly: in most statistical applications, a **high** chi-square value indicates the data *doesn't* fit the hypothesized distribution — meaning the null hypothesis is rejected. Here, it's inverted: a **low** χ² value means the observed data fits the "perfectly random 50/50 split" hypothesis *unusually well* — and since natural, unmanipulated images essentially never produce a naturally perfect 50/50 split (real photographic data has structure, correlation, and skew, as established in Week 5 and the previous lesson), an unexpectedly good fit to *pure randomness* is itself the anomaly. **Low χ² → high suspicion of embedding. High χ² → the pair distribution looks naturally skewed, as expected from real image content → low suspicion.**

## Your own \`chiSquarePoVScore()\`, walked through line by line

\`\`\`ts
for (let pairBase = 0; pairBase < 256; pairBase += 2) {
  const evenCount = observed[pairBase];
  const oddCount = observed[pairBase + 1];
  const total = evenCount + oddCount;
  if (total === 0) continue;

  const expected = total / 2;
  chiSquare += Math.pow(evenCount - expected, 2) / expected;
  pairsEvaluated++;
}
\`\`\`

This is a **direct implementation** of the formula above — \`expected = total / 2\` is exactly the previous lesson's expected-value derivation, and \`Math.pow(evenCount - expected, 2) / expected\` is one term of the chi-square sum (computing it just for the even half of each pair is mathematically sufficient here, since the odd half's squared deviation from the same expected value is identical by construction — \`(observed_odd − expected) = -(observed_even − expected)\`, and squaring removes the sign).

\`\`\`ts
const avgChiSquare = chiSquare / pairsEvaluated;
const normalized = 1 - Math.min(1, avgChiSquare / 3.0);
return Math.round(Math.max(0, normalized) * 100);
\`\`\`

This final step converts the raw chi-square statistic into your project's standardized 0–100 suspicion score: since **low** χ² means high suspicion (the inversion explained above), the code computes \`1 - normalized_chi_square\` — a low raw χ² produces a value close to 1 (high suspicion score), and a high raw χ² produces a value close to 0 (low suspicion score). The \`/ 3.0\` divisor and \`Math.min(1, ...)\` clamp are a practical calibration choice — mapping the theoretically unbounded raw χ² range onto a bounded 0–1 scale before converting to a percentage, since real chi-square values from actual image data don't have a single universal "maximum" the way a probability does.

## Why this detector needs its 1.0 weight relative to entropy's 0.6

Recall from your \`mockDetectors.ts\`: \`chiSquareDetector\` carries weight \`1.0\`, versus \`entropyDetector\`'s \`0.6\`. This lesson's math explains why that weighting choice is well-founded: chi-square specifically targets the mechanistic signature LSB embedding *always* produces (the flattening effect is a direct mathematical consequence of the embedding process itself, not a heuristic correlation), whereas global entropy (Week 1's detector) is a much blunter instrument, prone to false positives on legitimately high-entropy clean content (already-compressed images, certain textures) — exactly as noted in that detector's own weighting rationale.

## Check your understanding

- Using the formula, manually compute χ² for a single pair with \`evenCount = 480, oddCount = 520\` (so \`expected = 500\`). Is this closer to "naturally skewed" or "suspiciously balanced," and does your intuition match what a value this close to expected implies about embedding likelihood?
- Why does your codebase compute chi-square across R, G, B channels combined into one \`observed\` histogram (see \`chiSquareDetector.ts\`'s \`getPixelBytes\`), rather than computing three completely separate chi-square statistics, one per channel? What's the tradeoff between combining channels (more total samples, smoother statistic) versus keeping them separate (channel-specific sensitivity, since embedding might not be uniform across R, G, B if a real implementation targeted specific channels differently)?
`,
  },
];