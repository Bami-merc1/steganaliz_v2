import type { Lesson } from '../../types/curriculum';

export const WEEK_9_LESSONS: Lesson[] = [
  {
    id: 'w9-eof-ads',
    title: 'EOF-appended data and NTFS Alternative Data Streams',
    summary: 'Two structural exploitation techniques that hide data outside a file\'s "official" content entirely.',
    estimatedMinutes: 25,
    content: `
## EOF-append: revisited and formalized

You met this conceptually in Week 2 and Week 4's polyglot lesson — this is where you build it as a real, working technique. The mechanism: take a valid file, and append arbitrary bytes after its format-defined end marker (PNG's \`IEND\` chunk, JPEG's \`FF D9\` EOI marker). Every standards-compliant parser stops reading at that marker and never visits the appended bytes, so the file remains **perfectly valid and renders normally**, while silently carrying extra data.

\`\`\`
[========= valid, complete file structure =========][end marker][===== hidden payload =====]
                    ^ every normal parser stops here and never reads past it ^
\`\`\`

**Framing matters here too** — exactly like your \`pngLsbEmbed\`'s length-prefix header (Week 1's endianness lesson), an EOF-append implementation needs some way to know how much appended data to read back out during extraction: either a length prefix, a fixed sentinel/delimiter marking the payload's end, or (least robust) simply reading to true end-of-file and hoping nothing else gets appended later by another process.

**Detectability**: this is deliberately the simplest technique in the entire course, and correspondingly the easiest to catch — any tool that fully parses a file's format-defined structure and compares the parsed length against the actual file size will immediately flag a mismatch. This is precisely the "EOF append detector" already present (as a mock) in your \`mockDetectors.ts\` — implementing it for real is a straightforward, mechanical check: parse the expected structure, compare against \`file.size\`.

## NTFS Alternative Data Streams (ADS)

A completely different mechanism, specific to the NTFS filesystem (recall the MFT discussion from Week 3). NTFS allows a single file to have **multiple independent data streams** attached to it — the "main" stream is what every normal application reads and writes by default, but additional named streams can exist alongside it, accessed via the syntax \`filename.txt:streamname\`.

\`\`\`
notes.txt              → the normal, visible file content
notes.txt:secret        → an entirely separate data stream, same file entry, invisible
                           to Explorer, most command-line tools (dir, ls-equivalents),
                           and virtually all file-size/content displays by default
\`\`\`

This is structurally different from EOF-append: ADS data isn't hidden *within* the visible file's bytes at all — it's a **separate stream attached to the same MFT record** (recall Week 3: NTFS tracks file identity via MFT records, and ADS is a feature of that record structure itself). Critically: **the main stream's size is completely unaffected** by however much data lives in an alternate stream — a 10-byte \`notes.txt\` can have a 500 MB hidden stream attached, and \`notes.txt\`'s reported size will still show 10 bytes, since ADS data isn't counted in that figure by most standard tools.

## Why ADS is a genuinely different threat model than file-content steganography

Detecting ADS requires tools that specifically query NTFS for alternate streams (\`dir /r\` on Windows, or specific forensic/PowerShell tooling) — a normal file-size check, hash comparison of visible content, or even a full parse of the visible file's format structure (which would catch EOF-append) **completely misses ADS**, because the hidden data was never part of the file's content or structure to begin with — it's a filesystem-level feature being used as a hiding mechanism, one level below anything a content-based steganalysis tool can see. This is a clean, concrete illustration of why comprehensive forensic investigation requires understanding the *filesystem* (Week 3), not just file formats (Weeks 1–2, 4) — the same theme from Week 3's inode/MFT lesson, now given a concrete offensive use case.

## Why this places outside Steganaliz's reach — and where the line is

EOF-append is fully implementable client-side (it's pure byte manipulation on a \`File\`/\`Blob\`, no different in principle from what \`pngLsbEmbed\` already does), and is on your project's engine roadmap. ADS, by contrast, is fundamentally a **filesystem-level** feature — creating or reading one requires OS-level file APIs that browsers deliberately don't expose (the same sandbox boundary from Weeks 3 and 8), so it's included here as essential *knowledge* for understanding the full landscape of data-hiding techniques, even though it's not something a browser tool could ever implement or detect directly.

## Check your understanding

- Why would a hash comparison between a suspected stego file and its claimed "original" catch EOF-append trivially, but require an entirely different approach (stream enumeration, not hashing the default stream) to catch ADS?
- If you were designing a length-prefix framing scheme for your own EOF-append engine (as suggested above), what specific field from your existing \`pngLsbEmbed\` payload framing could you directly reuse conceptually, even though the storage mechanism (appended bytes vs. pixel LSBs) is completely different?
`,
  },
  {
    id: 'w9-font-whitespace',
    title: 'Font steganography and whitespace text manipulation',
    summary: 'Hiding data in plain text itself — no binary format required at all.',
    estimatedMinutes: 20,
    content: `
## Text as a carrier: a different category entirely

Every technique so far has assumed a binary carrier (image, audio, or a raw file's bytes). Text-based steganography hides data in something that *looks* like ordinary, human-readable text — exploiting the fact that text rendering and text storage are not the same thing, and that certain characters are functionally invisible when rendered.

## Whitespace steganography

The core insight: **trailing spaces, tabs, and certain whitespace sequences at line ends are invisible when text is displayed**, but are fully present in the underlying character stream. A payload can be encoded as, for example, a pattern of spaces vs. tabs appended to the end of each line of an otherwise completely normal-looking document:

\`\`\`
Line 1: "The quarterly report is attached."[space][space][tab]     → encodes bits: 0 0 1
Line 2: "Please review by Friday."[tab][space][space]              → encodes bits: 1 0 0
\`\`\`

Anyone reading the document sees nothing unusual — the extra whitespace is invisible in virtually every rendering context (a web page, a printed document, most text editors with word-wrap). But a program reading the raw text stream can trivially recover the exact whitespace sequence and decode the hidden bits.

## Zero-width characters: the Unicode-era version

Recall Week 1's Unicode lesson: Unicode defines thousands of code points beyond visible printable characters, including several **zero-width characters** — Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D) — that render as literally nothing, contributing zero visible width to text, yet are fully valid, individually distinguishable Unicode code points. This gives at minimum a 2-symbol alphabet (enough to encode binary directly) that is **completely invisible** in rendered text, arguably a cleaner mechanism than whitespace manipulation, since zero-width characters don't risk being silently collapsed or stripped by tools that normalize trailing whitespace (a real risk for the whitespace approach — many text processors and version control diff tools automatically strip trailing spaces, silently destroying a whitespace-based payload).

\`\`\`
Visible text:  "See you tomorrow"
Actual bytes:  S e [ZWSP] e [ZWNJ] [ZWSP] y o u ... (zero-width chars interspersed, invisible when rendered)
\`\`\`

This is exactly the \`zero-width\` technique referenced in your project's engine roadmap (\`techniqueForExtension()\` already maps \`.txt\`/\`.md\`/\`.html\`/\`.xml\` files to this technique, even though the actual embedding engine for it hasn't been built yet) — implementing it would mean mapping payload bits to a sequence of zero-width Unicode characters and interleaving them into the carrier text, then reversing that mapping on extraction by scanning for those specific code points.

## Font steganography: a related but distinct technique

Rather than hiding data in the text's characters, font-based steganography hides data in **subtle, custom-designed variations of individual glyphs** within a specially-crafted font file used to render the document — e.g., encoding a bit by whether a particular letterform has an imperceptibly different curve or stroke width than the "standard" version of that glyph in the same font. This requires the hidden message's recipient to have (or the document to embed) the specific modified font, and is considerably more complex to construct than whitespace or zero-width approaches — but it's harder to detect via straightforward text/byte inspection, since the character stream itself is completely unmodified; the hiding happens entirely in how those characters are visually rendered.

## Detection approaches for text-based hiding

Whitespace and zero-width techniques share a detection weakness: they're **detectable by direct inspection of the raw byte/character stream** — a tool that scans specifically for trailing whitespace patterns, or for the presence of any zero-width Unicode code points at all (which essentially never appear in genuinely ordinary human-authored text), can flag their presence with high confidence, even without decoding the actual payload. This is meaningfully different from the statistical, probabilistic detection approaches Phase 3 covers for image/audio steganography — text-hiding detection is closer to straightforward pattern/signature matching than statistical inference, because the "carrier" (visible text) and "hidden channel" (invisible characters) are cleanly, structurally separable in a way pixel values are not.

## Check your understanding

- Why is zero-width character detection close to a deterministic, near-zero-false-positive check (unlike, say, entropy analysis from Week 5, which has known false-positive risk on already-compressed clean files)? What does this imply about how confidently a detector could flag it?
- If a payload needed to survive being copy-pasted between different applications (e.g., from a text editor into an email client), which technique from this lesson would be more fragile — whitespace-based or zero-width-based — and why, given what you know about how different applications commonly normalize text?
`,
  },
];