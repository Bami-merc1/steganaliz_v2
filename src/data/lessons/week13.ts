import type { Lesson } from '../../types/curriculum';

export const WEEK_13_LESSONS: Lesson[] = [
  {
    id: 'w13-file-carving',
    title: 'Heuristic file carving without a filesystem',
    summary: 'Recovering files from raw, unstructured data using only magic numbers and structural knowledge — no filesystem metadata required.',
    estimatedMinutes: 25,
    content: `
## The forensic scenario this solves

Everything up to now assumed you have a *complete, identifiable file* to analyze. File carving addresses a harder, very real forensic scenario: given a raw block of bytes with **no filesystem metadata at all** — a corrupted disk image, unallocated disk space (recall Week 3's slack-space and "deleted files aren't really gone" lessons), or a memory dump — can you recover individual files purely from the *content itself*?

## The core technique: signature-based carving

This is Week 2's magic-number lesson, applied as an active recovery technique rather than passive identification. The algorithm, at its simplest:

\`\`\`
1. Scan the raw byte stream from start to end.
2. At every position, check if the bytes match a known file signature (header).
3. On a match, record the starting offset and assumed file type.
4. Scan forward from that offset looking for the corresponding known footer/end-marker
   for that file type (e.g., PNG's IEND chunk, JPEG's FF D9 marker).
5. Extract everything between the identified header and footer as a candidate recovered file.
6. Continue scanning from where the footer was found (or from header+1 if no footer found).
\`\`\`

This is precisely why Week 2 emphasized that formats differ in whether they have explicit, reliably-detectable end markers — **carving tools depend directly on this property**. PNG (explicit \`IEND\` chunk) and JPEG (explicit \`FF D9\` marker) are comparatively easy to carve reliably; formats without a clear standardized footer are much harder, often requiring the carving tool to instead compute an expected length from header fields (if the format specifies one) or use format-specific heuristics about valid internal structure.

## Why this is "heuristic," not guaranteed

Carving without filesystem metadata means the tool has **no ground truth** about where one file actually ends and unrelated data begins — it's inferring boundaries purely from format knowledge. This creates real, known failure modes: **file fragmentation** (if a file's data isn't stored contiguously on disk — a filesystem-level detail from Week 3 that carving, operating below the filesystem layer, has no way to know about — carving will either produce a corrupted/truncated result or incorrectly stitch together unrelated fragments), and **false-positive header matches** (some magic number patterns can coincidentally appear within unrelated binary data, triggering a carve attempt that produces garbage output).

## Direct connection to EOF-append steganography (Week 9)

Here's a genuinely important connective insight: file carving's "scan forward for the footer, treat everything after it as separate" logic is **structurally the exact same operation** as detecting EOF-appended steganographic payloads. A carving tool run against a steganography-laden file would, as a natural side effect of its normal operation, extract the legitimate carrier file correctly (header-to-footer) and then — because it continues scanning past the footer looking for the *next* file's header — either flag the appended bytes as "unidentified data following a recognized file" (itself a suspicious signal) or, if the appended data happens to itself be a legitimately-typed file (as in the JPEG+ZIP polyglot from Week 4), successfully carve out a second, completely separate file from the same original blob. This is precisely why forensic carving tools are frequently used as a first-pass steganalysis technique in real investigative workflows, independent of any dedicated statistical detector.

## Check your understanding

- Given the EOF-append connection above, sketch how you'd implement an "EOF append detector" using carving logic specifically: given a file already known to be, say, a PNG, how would you use header/footer scanning to determine whether there's unexpected trailing data, and how does this differ from (or relate to) simply comparing parsed structure length against \`file.size\`, as mentioned back in Week 9?
- Why does file fragmentation (a filesystem-level phenomenon from Week 3) specifically break simple header-to-footer carving, while it wouldn't affect signature-based *identification* of a complete, unfragmented file (Week 2's original magic-number use case)?
`,
  },
  {
    id: 'w13-carving-frameworks',
    title: 'Automated extraction frameworks (Binwalk, Scalpel) and signature database scanning',
    summary: 'How real-world tools operationalize the carving concepts from the previous lesson at scale.',
    estimatedMinutes: 20,
    content: `
## Why dedicated frameworks exist

The previous lesson's algorithm is conceptually simple but has countless format-specific edge cases: differing signature lengths, ambiguous or missing footers, nested/embedded file types (a ZIP inside a firmware image inside a disk image), and the sheer volume of known file-type signatures worth checking (hundreds, in comprehensive tools). Rather than every forensic investigator hand-rolling this logic per-case, established frameworks package comprehensive, maintained signature databases and extraction logic.

## Binwalk

Originally built for firmware analysis (embedded device images — routers, IoT devices — which frequently contain multiple filesystems, compressed archives, and executable code all concatenated or nested together, precisely the kind of structurally complex blob this lesson's techniques target), Binwalk scans a target file against an extensive signature database and reports every match it finds, at every offset, **including matches that turn out to be nested inside other identified regions** — e.g., correctly identifying that bytes 4,096–98,304 of a firmware image are a SquashFS filesystem, which itself, once extracted, contains a further-nested compressed archive at a specific internal offset.

This recursive, "keep unpacking what you find" behavior is directly relevant to the polyglot concept from Week 4 — a well-constructed polyglot or a file with an EOF-appended secondary payload is precisely the kind of structure Binwalk's signature-scan-everywhere approach is designed to surface, since it doesn't assume there's only "one file" to find and stop looking after the first match.

## Scalpel (and its predecessor, Foremost)

Where Binwalk is general-purpose and recursive, Scalpel is a more classically-focused **file carver** in the sense of the previous lesson: given a configuration file specifying which header/footer signature pairs to search for, it scans a target (typically a raw disk image) and extracts every matching header-to-footer region as a separate output file, optimized specifically for the "recover deleted or fragmented files from raw disk/memory data" forensic use case from Week 3's slack-space discussion, rather than firmware/nested-container analysis.

## Signature database scanning as a general concept

Both tools rely on the same underlying resource: a maintained, extensive **database of known file signatures** — essentially a much larger, more rigorously maintained version of the magic-number table from Week 2's opening lesson, often including not just the simple header bytes but additional structural fingerprints (footer patterns, characteristic internal byte sequences, even format-specific version markers) to reduce false-positive matches on coincidental byte patterns. This is a useful bridge concept into Week 14: a signature database is, in a sense, the simplest possible "detection model" — a fixed, hand-curated lookup table — which sets up a natural contrast with the *learned*, statistically-derived models covered next.

## Why these tools matter for a complete understanding of the field, even outside Steganaliz's direct scope

Neither Binwalk nor Scalpel can run inside a browser sandbox (both require filesystem and often native binary execution access, well beyond what any web application — including Steganaliz — is permitted), but understanding their approach clarifies an important distinction for your own project: your Detect module's statistical detectors (entropy, chi-square, and the RS/other mocks) answer "does this file's *content* look statistically manipulated," while carving frameworks answer a structurally different question — "does this file *contain other, distinct, identifiable files/structures* within it." A genuinely comprehensive forensic investigation, in a full desktop/server context, would typically use both approaches together, since they catch different threat models (statistical embedding vs. structural concatenation/nesting) — directly paralleling the "diverse detector suite" theme from Weeks 10–12.

## Check your understanding

- Why is Binwalk's *recursive* unpacking (extracting a nested archive, then scanning inside it for further nested content) specifically well-suited to catching multi-layered hiding techniques, such as a payload that's first compressed, then encrypted, then EOF-appended to a carrier image?
- Given that both tools depend on signature-database quality, what would happen to their effectiveness against a genuinely novel, custom file format or an intentionally obfuscated header (recall Week 4's discussion of deliberately mismatched magic numbers) that isn't in their database at all? What does this suggest about the fundamental limitation shared by all signature-based approaches, motivating Week 14's shift toward learned models?
`,
  },
];