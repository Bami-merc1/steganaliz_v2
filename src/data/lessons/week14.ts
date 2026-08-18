import type { Lesson } from '../../types/curriculum';

export const WEEK_14_LESSONS: Lesson[] = [
  {
    id: 'w14-classical-limitations',
    title: 'Limitations of classical statistical steganalysis on modern adaptive algorithms',
    summary: 'Why chi-square, RS analysis, and hand-derived statistics eventually hit a ceiling - and what that ceiling actually is.',
    estimatedMinutes: 20,
    content: `
## What "classical" means in this context

Every detector covered in Weeks 10–13 - entropy, chi-square, RS analysis, carving - shares a common design pattern: a human researcher identified **one specific statistical property** that natural images reliably have and that a particular embedding technique reliably disrupts, then built a targeted test around exactly that property. This is a powerful approach, but it has a structural ceiling: **each classical detector is only as good as the one assumption it was built around.**

## Adaptive embedding as a direct counter

Recall Week 6's PVD and Week 7's F5 - both were explicitly engineered as *responses* to classical detectors, specifically designed to avoid producing the statistical signature the corresponding detector looks for (F5's decrement-and-skip avoiding chi-square's flattening signature; PVD's content-adaptive embedding rate avoiding uniform-rate assumptions). This arms-race pattern, named explicitly back in Week 7, has continued well beyond PVD and F5: modern **adaptive steganography** algorithms (a family that includes HUGO, WOW, S-UNIWARD, and others in the research literature) go further still - they use sophisticated cost functions to embed payload bits specifically in image regions that are naturally *hardest to model statistically* (highly textured, noisy regions - directly extending the PVD intuition from Week 6 to its logical extreme), making the resulting statistical fingerprint deliberately resemble natural image noise as closely as possible, sometimes across *multiple* classical statistical properties simultaneously, not just one.

## The core problem: hand-derived features don't generalize

A chi-square test knows about one specific thing: value-pair balance. An RS test knows about one specific thing: local smoothness disruption. Neither test has any way to detect a *different* kind of statistical anomaly it wasn't specifically designed to look for - and a sufficiently sophisticated adaptive algorithm can, in principle, be engineered to specifically avoid whichever handful of known classical signatures its designers were aware of, while still being detectable in principle by *some* statistical property, just not one any existing classical test happens to check.

This is the actual, precise motivation for machine learning approaches in this field - not that ML is inherently "better" in some vague sense, but that it addresses this specific structural weakness: **rather than a human manually selecting one or a few hand-derived statistical properties to test, a machine learning model can be trained to discover which combination of potentially hundreds or thousands of subtle statistical properties, considered jointly, best separates clean images from stego images** - including properties no human researcher explicitly identified or named.

## Why this doesn't make classical detectors obsolete

Worth stating plainly, tying back to the recurring "diverse detector suite" theme from Weeks 10–12: classical detectors remain fast, computationally cheap, interpretable (you can explain *exactly why* chi-square flagged something - Week 11's formula is fully transparent), and genuinely effective against the (still very common, especially in CTF and introductory contexts) naive/non-adaptive embedding techniques this entire curriculum has focused on building and understanding. Machine learning steganalysis is specifically valuable against *sophisticated, adaptive* embedding - it's an additional, complementary layer for a harder threat model, not a wholesale replacement for the interpretable statistical tools your project's Detect module already implements.

## Check your understanding

- Why does an adaptive algorithm's strategy of "embed where natural noise is highest" specifically undermine RS analysis's core assumption (recall Week 12: RS depends on natural images having a reliable local-smoothness asymmetry)?
- Given the "no single classical test generalizes" problem described here, why might a machine learning model trained on a *specific* dataset of clean/stego image pairs still fail to generalize well to a genuinely novel embedding technique it never saw during training? (This previews a real, known limitation of ML-based steganalysis worth being aware of, not just its strengths.)
`,
  },
  {
    id: 'w14-srm-features',
    title: 'Feature extraction frameworks: Spatial Rich Models (SRM)',
    summary: 'The specific engineered feature set that made ML-based steganalysis practically effective, before deep learning approaches emerged.',
    estimatedMinutes: 20,
    content: `
## Why raw pixels aren't fed directly into early models

A naive approach might be: just feed raw pixel values into a classifier and let it learn everything from scratch. Early steganalysis research found this doesn't work well with limited training data (labeled clean/stego image datasets are expensive to produce at scale) - raw pixel values carry enormous amounts of *content-related* variation (what the photo is actually a picture of) that has nothing to do with whether it's been steganographically modified, effectively burying the relevant signal in irrelevant noise from the model's point of view.

**Spatial Rich Models (SRM)**, developed by Fridrich and Kodovský (the same Fridrich behind Week 12's RS analysis - a meaningful continuity across this course's steganalysis lineage), address this by first computing a large, diverse collection of **hand-engineered noise-residual features**, specifically designed to strip away image *content* while preserving exactly the kind of subtle statistical texture that embedding disrupts - then feeding *those* features (rather than raw pixels) into a classifier.

## How SRM features are computed, conceptually

The core idea: apply many different small, high-pass-filter-like operations (mathematically similar in spirit to Week 7's DCT - transforms that separate different frequency/structural components of an image) across the image, each designed to highlight a different kind of local pixel relationship (horizontal differences, vertical differences, diagonal differences, second-order differences, and so on - dozens of distinct filter variants). For each filtered "noise residual" version of the image, SRM then builds a **co-occurrence matrix** - essentially a histogram-like structure counting how often specific small patterns of adjacent residual values occur together, directly extending the "count how often values occur" logic from chi-square (Week 11), just across a much richer, higher-dimensional space of patterns rather than simple value pairs.

\`\`\`
Chi-square (Week 11):  count occurrences of individual pixel VALUES → compare pair balance
SRM:                   count occurrences of small PATTERNS of residual values
                        across dozens of different filtered "views" of the image
                        → thousands of resulting feature dimensions per image
\`\`\`

The result is a **high-dimensional feature vector** (often tens of thousands of numbers) per image - far too many dimensions for a human to inspect directly, but exactly the kind of structured, content-independent input a classifier (traditionally, for SRM specifically, an ensemble classifier - many simple classifiers voting together) can learn meaningful patterns from.

## Why this is a genuine generalization of everything in Phase 3

It's worth explicitly naming the throughline here: chi-square (Week 11) is, in a real sense, a tiny, hand-picked, single-feature special case of the same general strategy SRM formalizes at scale - both approaches are fundamentally about **counting how often certain patterns occur, and comparing that against what's statistically expected in natural content**. SRM's innovation isn't a conceptually different idea from chi-square; it's the same idea, systematized across dozens of filters and thousands of pattern types simultaneously, specifically so that a learning algorithm - rather than a human researcher - can determine which of those thousands of measured patterns actually matter for separating clean from stego content, and how to weigh them together.

## Why this remains firmly outside Steganaliz's practical scope

Beyond the training-data and computational requirements (SRM feature extraction and classifier training are substantially more computationally intensive than any of the closed-form, per-image statistical formulas your existing detectors compute in milliseconds), implementing this meaningfully would require either training a real classifier on a genuine labeled dataset (a serious undertaking, well beyond a single project's typical scope) or shipping a pre-trained model's weights into a browser context and running inference client-side - architecturally possible in principle (browser-based ML inference is a real, growing capability), but a substantial, separate engineering project from everything covered in this curriculum so far.

## Check your understanding

- Why does computing features from *noise residuals* (after high-pass filtering) rather than raw pixel values specifically help separate "steganography-related statistical anomaly" from "this image happens to depict a genuinely complex, busy scene"?
- Given SRM's conceptual continuity with chi-square described above, why might a classifier trained on SRM features still benefit from *also* having your project's simpler detector outputs (entropy score, chi-square score) as additional input features, rather than relying on SRM features alone?
`,
  },
  {
    id: 'w14-cnn-classification',
    title: 'Training Convolutional Neural Networks (CNNs) for classification',
    summary: 'The modern deep-learning approach that learns its own features directly, and how it compares to SRM.',
    estimatedMinutes: 25,
    content: `
## The next step: learning the features too, not just the classifier

SRM (previous lesson) still relies on **human-engineered** feature extraction - researchers specifically designed the filters and co-occurrence structures, and only the final classification step is learned from data. Convolutional Neural Networks (CNNs) push the automation one level further: rather than hand-designing filters, a CNN **learns its own filters directly from training data**, discovering which patterns are most discriminative for the specific task (clean vs. stego classification) without a human pre-specifying what those patterns should look like.

## Why convolution specifically suits this problem

A convolutional layer applies a small, learnable filter across an entire image (or, in later layers, across the previous layer's output), computing a weighted sum at each position - structurally very similar to the high-pass filtering step in SRM's pipeline, except the filter's actual numeric weights are **learned through training** rather than fixed by a researcher in advance. Early layers in a steganalysis CNN often end up learning filters that resemble hand-designed high-pass/noise-residual filters similar in spirit to SRM's - a genuinely interesting research finding, since it suggests the network is independently rediscovering something close to what domain experts had already hand-derived, while also being free to learn additional patterns beyond what any human explicitly specified.

## The training process, at a conceptual level

\`\`\`
1. Assemble a large dataset: many clean images, and many stego versions of
   (often the same) images, embedded using one or more known techniques.
2. Feed images through the network; it outputs a clean/stego prediction.
3. Compare prediction against the known true label; compute an error/loss value.
4. Adjust every learnable filter weight slightly, in the direction that would
   have reduced this specific error (a process called backpropagation).
5. Repeat across the entire dataset, many times (epochs), until performance
   on held-out validation data stops improving.
\`\`\`

This is the same fundamental training loop used across nearly all modern deep learning applications - steganalysis is simply one specific classification task the general technique gets applied to, using image data structured the way this course's Weeks 5–7 covered (pixel arrays, channels, and - for JPEG-domain CNN steganalysis - sometimes DCT coefficients directly, rather than decoded pixels, directly connecting back to Week 7's transform-domain discussion).

## Why "trained on a specific dataset" is both the strength and the limitation

A well-trained CNN can substantially outperform classical detectors specifically against the embedding techniques well-represented in its training data - including sophisticated adaptive techniques (previewed in this week's first lesson) that classical detectors were never designed to catch. But this strength comes with the exact limitation flagged in that first lesson's check-your-understanding question: **a CNN's learned filters are shaped entirely by what it was shown during training** - presented with a genuinely novel embedding technique, structurally different from anything in its training data, a CNN has no guaranteed advantage over classical methods, and in some documented cases performs *worse* than a well-chosen classical test specifically tuned for that novel technique, precisely because the CNN's learned features were optimized for a different statistical signature entirely.

## Closing the loop: why this course built classical detectors first

This is the deliberate pedagogical reasoning behind this curriculum's structure, worth stating explicitly now that you've reached the end of Phase 3: understanding chi-square's exact mathematical mechanism (Week 11), RS analysis's smoothness-asymmetry logic (Week 12), and SRM's noise-residual co-occurrence approach (this week's previous lesson) gives you a genuine, transferable intuition for **what kind of statistical property any detector - classical or learned - is fundamentally trying to capture**. A CNN is not magic; it's an automated, more powerful search process over the same broad space of "statistical properties that natural images have and stego images disrupt" that every technique in this course has been exploring by hand. Understanding the classical techniques deeply is what allows you to meaningfully evaluate, critique, and reason about the limitations of a learned model's output, rather than treating it as an unexplainable black box.

## Check your understanding

- Given everything from this week, if you had to choose just one detector to add to Steganaliz's suite next (beyond what's already mocked), would you prioritize implementing RS analysis properly (Week 12), or attempting a lightweight, browser-compatible ML-based detector? Justify your answer using this week's discussion of training-data dependency and implementation complexity.
- Why does the "early CNN layers rediscovering something like SRM's hand-designed filters" finding, mentioned above, serve as a kind of independent validation of the classical statistical reasoning this entire course has built up - rather than suggesting that classical understanding was a waste of time now that learned approaches exist?
`,
  },
];