import type { Lesson } from '../../types/curriculum';

export const WEEK_12_LESSONS: Lesson[] = [
  {
    id: 'w12-rs-fundamentals',
    title: 'Regular-Singular (RS) Steganalysis fundamentals',
    summary: 'A more powerful statistical attack than chi-square, built on pixel-group classification rather than value-pair counting.',
    estimatedMinutes: 25,
    content: `
## Why a second statistical technique, beyond chi-square

Chi-square (Week 11) is effective but has a real limitation: it becomes markedly less reliable at **low embedding rates** — recall the "diluted by untouched regions" problem from Week 10, which applies to chi-square too, just measured globally rather than regionally. RS analysis was developed specifically to be **more sensitive at low embedding rates** than chi-square, and — as a valuable side benefit — to actually **estimate the approximate size of the embedded payload**, not just flag its presence, which chi-square alone cannot do.

## The core mechanism: grouping and classifying pixels

RS analysis divides an image into small groups of adjacent pixels (commonly groups of 4). For each group, it defines a **discrimination function** \`f\` that measures the group's "smoothness" or "regularity" — typically based on the sum of absolute differences between adjacent pixel values within the group:

\`\`\`
f(group) = |p1 - p2| + |p2 - p3| + |p3 - p4|   (for a 4-pixel group, simplified)
\`\`\`

A lower \`f\` value indicates a smoother, more regular group (adjacent pixels close in value); a higher \`f\` value indicates a rougher, noisier group.

## The "flipping" operation

RS analysis then applies a specific **flipping function** \`F\` to each group's LSBs — a fixed, invertible bit-flip pattern (not payload-dependent; this is a deliberate analysis step, applied by the *detector*, not related to how the original payload, if any, was embedded) — and recomputes \`f\` on the *flipped* version of each group.

Groups are then classified into three categories based on how \`f\` changes under flipping:

\`\`\`
Regular (R):   f(flipped group) > f(original group)   — flipping made it rougher
Singular (S):  f(flipped group) < f(original group)   — flipping made it smoother
Unusable (U):  f(flipped group) = f(original group)   — no change, excluded from analysis
\`\`\`

## The key statistical insight

In a **natural, unmanipulated image**, the proportion of Regular groups (\`R_M\`, counted under the flipping mask \`M\`) is reliably and consistently **greater than** the proportion of Singular groups (\`S_M\`) — this asymmetry is a genuine, well-documented statistical property of natural photographic content, arising from the same kind of local pixel correlation that makes natural images compressible in the first place (recall Week 7's DCT discussion: natural images have exploitable local structure, which is precisely why lossy compression works at all).

**LSB embedding disrupts exactly this asymmetry.** As embedding rate increases, the gap between \`R_M\` and \`S_M\` proportions shrinks, and at sufficiently high embedding rates, can even reverse (S groups outnumbering R groups) — a statistical signature entirely independent of, and complementary to, chi-square's pair-flattening signature. This is why RS analysis is considered a genuinely separate detection technique rather than just a variant of chi-square — it's sensitive to a different structural property of the data (local smoothness/regularity) rather than value-pair frequency balance.

## Why RS remains only mocked in your current detector suite

Implementing RS correctly requires: defining and tuning the discrimination function, implementing the specific flipping mask (a precise, standard bit-pattern the algorithm's originators defined — getting this wrong doesn't just weaken the detector, it can invalidate the statistical guarantees the technique depends on), and correctly computing the R/S proportions across both the mask and its complement (dual-masking, the next lesson's topic) — meaningfully more implementation complexity than chi-square's relatively direct pair-counting, which is a reasonable, honest reason it remains a mock (\`weight: 1.0\` in your \`mockDetectors.ts\`) rather than a shipped detector at this stage of the project.

## Check your understanding

- Why does RS analysis's reliance on *local smoothness* (adjacent pixel differences) rather than *global value-pair frequency* (chi-square's approach) make it a meaningfully different signal, capable of catching cases chi-square might miss?
- If an image were deliberately extremely noisy to begin with (e.g., a photo taken in very low light, with significant sensor noise), would you expect its *natural, unembedded* R/S asymmetry to be as pronounced as in a clean, smooth photo? What does this suggest about a potential false-positive risk for RS analysis, analogous to entropy analysis's known false-positive risk on already-compressed content?
`,
  },
  {
    id: 'w12-dual-masking-payload-estimation',
    title: 'Dual-masking functions and payload length estimation via curve fitting',
    summary: 'How RS analysis goes beyond detection to actually estimate how much data was embedded.',
    estimatedMinutes: 20,
    content: `
## Why one flipping mask isn't enough

The previous lesson introduced a single flipping mask \`M\` producing \`R_M\` and \`S_M\` proportions. RS analysis's full method also applies the **negated/complementary mask** \`-M\` (a specifically defined inverse of the original flipping pattern), producing a second pair of proportions: \`R_-M\` and \`S_-M\`. This is the "dual" in dual-masking.

## Why the complementary mask matters

The relationship between \`R_M\`, \`S_M\`, \`R_-M\`, and \`S_-M\` behaves differently under increasing embedding rate than either mask alone would suggest — critically, the *combination* of both masks' behavior provides enough independent information to set up a system that can be solved for the embedding rate itself, not just a binary "embedded or not" signal. This is the mathematical machinery that elevates RS analysis from a detector into an **estimator**.

## From proportions to a quadratic equation

The core mathematical result of RS steganalysis (established by its original authors, Fridrich, Goljan, and Du) is that the relationships between these four proportions, as a function of the true (unknown) embedding rate \`p\`, can be modeled as **quadratic curves** — and the point where specific curves derived from the \`M\` and \`-M\` measurements intersect gives a strong estimate of \`p\` itself.

\`\`\`
Conceptually (simplified):
  R_M(p) and S_M(p) — modeled as functions of embedding rate p
  R_-M(p) and S_-M(p) — modeled similarly, using the complementary mask

  Setting up the system: R_M(p) - S_M(p) = R_-M(p) - S_-M(p)   (approximately, at the true p)
  
  Solving this (a quadratic in p) yields an estimate p_hat ≈ actual fraction of pixels modified
\`\`\`

The full derivation involves fitting the observed \`R_M, S_M, R_{-M}, S_{-M}\` values against the theoretical quadratic curves and solving for the root that corresponds to a physically meaningful embedding rate (between 0 and 1) — this is genuinely one of the more mathematically involved techniques in the entire curriculum, and is intentionally presented here at a conceptual level rather than full derivation, since implementing it correctly is itself typically treated as a substantial undertaking even in dedicated forensic tooling.

## Why payload-length estimation matters practically

Chi-square (Week 11) and your \`entropyDetector\` (Week 1/5) both answer a **binary-ish** question: how suspicious does this file look. RS analysis's payload-estimation capability answers a **quantitative** question: roughly how much data, and by extension, does the estimated capacity used even make sense given the file's actual computed capacity (from your own \`getCapacityBytes()\` formula, Week 5) — a file whose RS-estimated embedding rate wildly exceeds its theoretical maximum capacity would itself be a strong signal that either the estimate is unreliable for this particular image, or that a *different* (non-standard-LSB) embedding technique was used, since the RS model's assumptions (built specifically around simple LSB substitution) may not hold.

## Where this leaves your verdict engine, structurally

If RS analysis were fully implemented, it would be a natural candidate for a comparatively **high weight** in your \`computeVerdict()\` calculation, given both its documented higher sensitivity at low embedding rates and its unique ability to provide a magnitude estimate that other detectors can't — but its implementation complexity is real, and a partially-correct RS implementation (e.g., an incorrectly-derived flipping mask) could plausibly produce *confidently wrong* results rather than just weak results, which is a meaningfully different and more dangerous failure mode than an admittedly-mocked detector — worth keeping in mind if this is ever implemented for real: correctness validation against known test vectors would be essential before trusting its output at a high verdict weight.

## Check your understanding

- Why is a detector that's "confidently wrong" (like a subtly-buggy RS implementation might be) potentially more harmful to a verdict engine's overall reliability than a detector that's honestly mocked and clearly labeled as such? Think about this in terms of the weighted-average math your \`computeVerdict()\` already implements.
- Given that RS's mathematical model is specifically built around simple LSB substitution's statistical behavior, would you expect it to generalize well to detecting PVD (Week 6) or F5 (Week 7) — techniques explicitly designed to produce a different statistical fingerprint than simple LSB? What does your answer suggest, once again, about why a diverse detector suite matters more than any single "best" detector?
`,
  },
];