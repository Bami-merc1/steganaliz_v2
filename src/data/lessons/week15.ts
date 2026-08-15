import type { Lesson } from '../../types/curriculum';

export const WEEK_15_LESSONS: Lesson[] = [
  {
    id: 'w15-course-synthesis',
    title: 'Course synthesis: from bits to verdicts',
    summary: 'Tying every phase together into one coherent mental model before the capstone assessment.',
    estimatedMinutes: 20,
    content: `
## The full arc, in one pass

This final lesson doesn't introduce new material — it explicitly connects everything across all 14 prior weeks into a single coherent picture, the way you'll need to hold it in your head for both the theoretical exam and the practical capstone.

## Phase 1 gave you the alphabet

Bits, bytes, hex, and endianness (Week 1) are how *any* data is represented at all. Magic numbers and structural anatomy (Week 2) are how that representation gets organized into meaningful formats. Sectors, clusters, and slack space (Week 3) are how those formats sit on physical storage, and why "deleted" doesn't mean "gone." MIME types, polyglots, and metadata structures (Week 4) showed you that a file's "identity" is never a single, unambiguous fact — it's a negotiation between several independently-controlled signals, and that gap is exploitable.

## Phase 2 showed you how to hide something in that alphabet

Every embedding technique from Weeks 5–9 is really the same underlying move, applied in a different domain: **find a place in a file's structure where a value can be altered slightly without breaking the file's validity or triggering human perception, and use that slack to encode payload bits.** LSB substitution (Week 5) does this at the pixel level, exploiting HVS limits. PVD and CSPRNG-driven scattering (Week 6) refine *where* and *how much* to alter, trading capacity against detectability. DCT-domain embedding (Week 7) does the same thing one level of abstraction up, in the frequency domain, because JPEG's lossy pipeline destroys naive pixel-level changes. Audio and network steganography (Week 8) apply the identical logic to entirely different carriers — amplitude samples, phase relationships, protocol header fields — each with its own perceptual or structural "slack" to exploit. EOF-append, ADS, and text-based hiding (Week 9) step back from statistical subtlety entirely and instead exploit **structural blind spots** — places parsers simply don't look, rather than places where a small statistical change goes unnoticed.

## Phase 3 taught you to find exactly what Phase 2 hid

And this is the deepest throughline of the entire course, worth stating as plainly as possible: **every steganalysis technique in Weeks 10–14 is a direct, mechanical response to a specific embedding technique's specific statistical or structural footprint.** Bitplane analysis and regional entropy (Week 10) catch embedding that's spatially *concentrated* rather than spread out — a direct consequence of Week 6's sequential-vs-randomized distinction. Chi-square (Week 11) catches the flattening effect that *any* random-bit LSB substitution mathematically must produce, regardless of domain. RS analysis (Week 12) catches a different, complementary statistical disruption — local smoothness asymmetry — giving it a different sensitivity profile than chi-square, especially at low embedding rates. Carving frameworks (Week 13) catch exactly the structural blind-spot exploitation from Week 9 — EOF-append and polyglots — by systematically checking for exactly the kind of "data the format's own parser would never look at" that those techniques rely on. And machine learning approaches (Week 14) exist specifically because sufficiently sophisticated *adaptive* embedding (the direct evolution of Week 6's PVD and Week 7's F5 design philosophy) can be engineered to avoid any *one* classical test's specific assumption — requiring a method that can discover novel statistical signatures automatically, rather than relying on a human having already identified and named the relevant pattern.

## Why no single technique, on either side, is ever "solved"

This is the field's defining, unavoidable structural truth, and you've now built up enough concrete technical grounding across 14 weeks to understand exactly *why* it's true, rather than taking it as a vague truism: **every embedding technique's imperceptibility rests on evading some specific detection method's specific assumption, and every detection method's power rests on some specific embedding technique's specific mechanical footprint.** Change one side, and the other side's effectiveness shifts. This is precisely why your own project's architecture — a weighted, multi-detector verdict engine rather than any single "best" test — isn't just a convenient engineering choice; it's the only architecturally honest response to a field that is fundamentally, permanently adversarial and multi-technique by nature.

## Check your understanding

- Pick any two embedding techniques from Phase 2 and any two detection techniques from Phase 3 that were *not* explicitly paired together as "this catches that" in their respective lessons. Reason through whether the detection technique would likely catch the embedding technique anyway, and why or why not, based purely on the underlying mechanisms — not because you were told the answer.
- Across the entire course, which single lesson's mechanism do you think generalizes most broadly across the *most* other lessons? Defend your choice.
`,
  },
  {
    id: 'w15-capstone-brief',
    title: 'Capstone brief: the CTF-style disk image challenge',
    summary: 'What the practical assessment actually asks of you, and how to structure your investigative approach.',
    estimatedMinutes: 15,
    content: `
## The assessment, restated

You are handed an unknown, unlabeled raw disk image (\`.raw\`). Your task: locate hidden files, determine what embedding method(s) were used, extract the encrypted payload(s), and produce a formal report documenting every step of your forensic process — not just your final answer, but your reasoning and methodology, since a real forensic report must be reproducible and defensible.

## A suggested investigative structure, mapped to the course

This isn't a checklist to follow mechanically — real forensic work is iterative, and you'll likely revisit earlier steps as later findings change your understanding. But as a starting structure, mapped explicitly to where each skill came from in this course:

**1. Filesystem-level reconnaissance (Week 3).** Before looking at individual files, understand the disk's own structure: partition table type (MBR/GPT), filesystem type (NTFS/ext4), and — critically — whether there's meaningful unallocated space or slack space worth examining, since a well-hidden payload may not be in a "normal," currently-referenced file at all.

**2. File identification and carving (Weeks 2, 13).** For every discoverable file — and for unallocated space, using carving techniques — verify actual file type via magic number, not extension. Discrepancies here (Week 4) are themselves a strong lead. Use signature-based scanning across the *entire* raw image, not just the filesystem's normal file listing, specifically to catch anything hidden via ADS (Week 9) or existing only in slack/unallocated space (Week 3).

**3. Structural anomaly checks (Weeks 2, 4, 9).** For each identified file, check whether its actual size matches what its internal structure claims it should be (EOF-append detection). Check for unexpected chunk types, unusual metadata fields, or signs of polyglot construction (multiple valid format structures in one file).

**4. Statistical steganalysis (Weeks 10–12).** For image/audio files that pass structural checks cleanly, apply entropy, chi-square, and (if you've implemented it) RS-style analysis to identify likely LSB or transform-domain embedding, even where structure looks completely normal.

**5. Extraction and decryption (Weeks 5–8, plus your project's crypto work).** Once a likely technique and carrier are identified, attempt extraction. If the payload appears encrypted (high entropy post-extraction, or a recognized framing header indicating encryption — recall your own project's flag-byte design from earlier in this course), document your approach to password recovery (dictionary/wordlist attack, informed by any contextual clues in the disk image itself) rather than treating it as a pure guessing exercise.

**6. Documentation.** For each finding, record: what you observed, which technique/lesson informed your interpretation, what you tried, and what worked or didn't. A reproducible methodology is itself part of what's being assessed — not just whether you found the flag.

## Why this mirrors Steganaliz's own architecture

Notice this investigative structure is, in miniature, exactly what your own project's module layout embodies: Metadata/structural checks, a multi-detector Detect suite, Extract, and CTF mode's multi-technique-with-wordlist approach are not arbitrary feature choices — they're a direct reflection of what a genuine forensic investigation actually requires, which is precisely why building this course's curriculum alongside a real, working tool has been mutually reinforcing throughout: the app is a working instrument for practicing exactly the investigative logic this capstone asks you to apply by hand.

## A final, honest note on scope

Some of this capstone's steps — filesystem-level reconnaissance and raw disk carving specifically — require tools and access (Week 3's and Week 13's territory) that a browser-based application, including Steganaliz itself, cannot provide, for the sandbox reasons discussed repeatedly across this course. That's expected, and appropriate: this capstone is designed to assess your *understanding of the full field*, including the parts that live outside any single tool's reach — while the file-level techniques (Weeks 2, 4–9, 10–12) are exactly the skills your own project puts directly into your hands, browser sandbox and all.
`,
  },
];