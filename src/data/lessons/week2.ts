import type { Lesson } from '../../types/curriculum';

export const WEEK_2_LESSONS: Lesson[] = [
  {
    id: 'w2-magic-numbers',
    title: 'File Signatures / Magic Numbers',
    summary: 'How software identifies a file\'s true type from its first few bytes - independent of its name.',
    estimatedMinutes: 25,
    content: `
## The problem with trusting file extensions

Renaming \`photo.exe\` to \`photo.png\` doesn't turn an executable into an image. The extension is just a hint for the operating system's shell - it carries zero enforcement. So how does software (your browser, your OS, antivirus engines, and your own Steganaliz app) actually determine what a file *is*?

The answer: nearly every binary file format begins with a fixed sequence of bytes called a **magic number** (or **file signature**) - a byte pattern the format's spec guarantees will always be present at (almost always) the very start of the file.

## Common magic numbers

| Format | Magic bytes (hex) | ASCII (where applicable) |
|---|---|---|
| PNG | \`89 50 4E 47 0D 0A 1A 0A\` | \`.PNG....\` |
| JPEG | \`FF D8 FF\` | - |
| GIF87a/89a | \`47 49 46 38\` | \`GIF8\` |
| BMP | \`42 4D\` | \`BM\` |
| PDF | \`25 50 44 46\` | \`%PDF\` |
| ZIP (and DOCX/PPTX/XLSX/APK, which are ZIP containers) | \`50 4B 03 04\` | \`PK..\` |
| WAV | \`52 49 46 46\` ... \`57 41 56 45\` | \`RIFF\` ... \`WAVE\` |
| ELF (Linux executables) | \`7F 45 4C 46\` | \`.ELF\` |
| MZ (Windows PE executables) | \`4D 5A\` | \`MZ\` |

Notice PNG's signature is unusually long and deliberate: \`89 50 4E 47 0D 0A 1A 0A\`. This isn't arbitrary -
- \`89\` is a non-ASCII byte that prevents the file from being mistaken for plain text.
- \`50 4E 47\` spells "PNG" in ASCII, for human-readable hex dumps.
- \`0D 0A\` (CRLF) and a lone \`0A\` (LF) detect corruption from naive text-mode file transfers that "helpfully" convert line endings - if a PNG file has ever had this happen to it, this signature will no longer match, immediately flagging it as damaged.

This is a good example of a format spec doing defensive engineering *inside the signature itself*.

## WAV: a signature with a "hole" in the middle

WAV's signature is actually two fixed strings separated by 4 bytes that vary: \`RIFF\`, then a 4-byte little-endian file size, then \`WAVE\`. Any correct WAV parser must check *both* fixed segments and skip over the size field - checking only the first 4 bytes (\`RIFF\`) isn't sufficient, since other RIFF-based formats (like AVI) share that same opening signature and only diverge at the \`WAVE\`/\`AVI \` marker.

## Why this matters directly for your project

Your \`techniqueForExtension()\` function currently trusts the **file extension** to decide the embedding technique. That's a reasonable simplification for a browser-based tool where users deliberately choose their carrier files - but it's worth understanding the gap: a production-grade forensic tool (which several of your Detect-tab detectors gesture toward) would instead read the actual magic number before trusting a file's type, precisely because attackers and CTF challenge designers routinely rename or mismatch extensions deliberately to confuse automated tooling.

This is also the exact mechanism your **Header consistency check** detector (currently mocked) should eventually implement for real: compare the file's *actual* magic number against what its extension claims, and flag a mismatch as suspicious.

## Worked example: reading a magic number by hand

Given the first 8 bytes of a file: \`89 50 4E 47 0D 0A 1A 0A\`

1. Compare against the known PNG signature table above - exact match.
2. Conclusion: this file is a PNG, regardless of what it's named.

If instead you saw \`FF D8 FF E0\`, the first 3 bytes (\`FF D8 FF\`) match JPEG's signature; the 4th byte varies depending on the specific JPEG variant (JFIF vs. Exif) and isn't part of the core signature.

## Check your understanding

- Why can't a magic number alone guarantee a file is *valid* (not just *the right type*)? What could still be wrong with a file whose magic number matches perfectly?
- If you renamed a \`.docx\` file to \`.zip\` and opened it in a zip utility, it would actually open correctly. Why, based on the table above?
`,
  },
  {
    id: 'w2-file-structure-anatomy',
    title: 'Dissecting file structure: headers, chunks, metadata, footers',
    summary: 'The common anatomy every binary format shares, and where steganographic payloads typically hide within it.',
    estimatedMinutes: 25,
    content: `
## The four structural zones

Almost every binary file format, regardless of purpose, organizes itself into some combination of these regions:

### 1. Header
Fixed-position data at the start: the magic number (Lesson 1), format version, and core parameters needed to parse the rest of the file - e.g., a BMP header states image width, height, and bit depth before a single pixel is read.

### 2. Chunks / segments / blocks
Many modern formats (PNG especially) are organized as a *sequence of self-describing chunks*, rather than one rigid structure. Each chunk typically has: a length field, a type identifier, the data itself, and often a checksum.

\`\`\`
PNG chunk structure:
[4 bytes: length] [4 bytes: chunk type] [length bytes: data] [4 bytes: CRC]
\`\`\`

Common PNG chunk types: \`IHDR\` (image header, always first), \`PLTE\` (palette), \`IDAT\` (the actual compressed pixel data - can appear multiple times), \`tEXt\`/\`iTXt\` (arbitrary text metadata), \`IEND\` (marks the end, always last).

**This chunk model is directly exploitable for steganography** - a well-formed but non-standard chunk type (something a strict parser ignores but doesn't reject) can carry an entire hidden payload without touching pixel data at all. This is the mechanism your project's doc refers to as "metadata injection," and it's why \`tEXt\` chunks specifically are a common steganography and CTF vector.

### 3. Metadata
Data *about* the file's content, rather than the content itself: EXIF (camera model, GPS coordinates, timestamp - for JPEG), ID3 (artist, album, track - for MP3), XMP (a more general, XML-based metadata standard used across Adobe formats and others). Metadata is frequently the *least* scrutinized part of a file by both humans and casual tooling, making it a favorite steganography target - and exactly why your \`stripMetadata()\` engine re-encodes images through a clean canvas rather than trying to selectively edit metadata fields.

### 4. Footer / trailer / EOF marker
Some formats explicitly mark their own end (PNG's \`IEND\` chunk, ZIP's End of Central Directory record). Critically, **many formats do not** - and even those that do, most parsers stop reading once they've found what they need and never verify there's nothing *after* the formal end.

## The EOF-append vulnerability, previewed

This "parsers stop reading early" behavior is precisely what your \`eof-append\` technique exploits (you'll build the full engine for it in Week 9): you can literally concatenate arbitrary bytes onto the end of a completely valid PNG or JPEG file. The image still opens and displays perfectly, because every image viewer stops parsing the moment it hits the format's own end-marker - the extra trailing bytes are simply never visited by that code path. This is simultaneously the *easiest* steganographic technique to implement and the *easiest* to detect (a competent EOF-scan just checks whether file length matches what the format's own internal structure claims it should be).

## Stream-based vs. chunk-based: a structural comparison

**Chunk-based** (PNG): self-describing, order-flexible for ancillary chunks, individually resumable/skippable by a parser - this is *why* metadata-chunk injection is comparatively "safe" (well-formed unknown chunks are typically ignored, not rejected).

**Stream-based** (JPEG): organized as a sequence of *markers* (each starting with \`FF\`) rather than length-prefixed chunks - a decoder reads markers sequentially and must understand each one to know where the next one starts. This is structurally less forgiving of injected unknown data sitting *between* markers (though JPEG does have defined markers, like \`COM\` and \`APPn\`, specifically reserved for exactly this kind of extension/metadata use).

## Check your understanding

- Why does a well-formed extra \`tEXt\` chunk not break a PNG file, while randomly inserted bytes in the middle of an \`IDAT\` chunk absolutely would?
- Given the EOF-append weakness described above, what's the simplest possible steganalysis check that would catch it? (You'll formalize this as an actual detector in Phase 3.)
`,
  },
  {
    id: 'w2-stream-vs-chunk',
    title: 'Structural comparison: stream-based vs. chunk-based files',
    summary: 'A deeper practical comparison, with a hex-level worked walkthrough of both.',
    estimatedMinutes: 20,
    content: `
## Walking a real PNG chunk-by-chunk

Take a minimal PNG's byte layout after the 8-byte signature:

\`\`\`
00 00 00 0D  49 48 44 52  [13 bytes of IHDR data]  [4-byte CRC]
^length=13   ^"IHDR"

00 00 04 00  49 44 41 54  [1024 bytes of compressed pixel data]  [4-byte CRC]
^length=1024 ^"IDAT"

00 00 00 00  49 45 4E 44  [4-byte CRC]
^length=0    ^"IEND"
\`\`\`

A parser's job is mechanical and format-agnostic in principle: read a 4-byte length, read a 4-byte type, read exactly \`length\` bytes of data, read a 4-byte CRC, repeat until it sees \`IEND\`. **The parser never needs to understand a chunk type it doesn't recognize** - it can always skip forward by exactly \`length\` bytes, because the length is stated up front. This self-describing property is what makes chunk-based formats comparatively easy to extend safely.

## Walking a real JPEG marker-by-marker

JPEG has no equivalent global length-prefix scheme. Instead:

\`\`\`
FF D8              → SOI (Start of Image) - no length, no data, just a 2-byte marker
FF E0 00 10 [data]  → APP0 (JFIF header) - length IS given here (0x0010 = 16 bytes total, including the length field itself)
FF DB 00 43 [data]  → DQT (quantization table)
FF C0 00 11 [data]  → SOF0 (start of frame)
FF C4 ... [data]    → DHT (Huffman table)
FF DA ... [data]    → SOS (Start of Scan) - after this, entropy-coded scan data follows directly, NOT length-prefixed
[entropy-coded pixel data...]
FF D9               → EOI (End of Image)
\`\`\`

The critical difference: **after the SOS marker, the scan data has no declared length at all.** The decoder must actually decode the entropy-coded stream to know where it ends (or scan forward for the next \`FF\` byte that isn't a stuffed \`00\`, since \`FF\` bytes inside real scan data are escaped). This is fundamentally different from PNG's "always know the length up front" model, and it's a direct reason why DCT/JPEG steganography (Week 7) is more delicate than PNG LSB work - you're operating inside a domain where structural boundaries are implicit in the data itself, not explicitly stated.

## Practical implication for building parsers (and your own engines)

This is exactly why \`pngLsbEmbed\`/\`pngLsbExtract\` in your codebase can get away with using the Canvas API rather than hand-parsing PNG chunk structure directly - the browser's own PNG decoder already handles all of the above for you, decoding straight to a flat RGBA pixel buffer. You only need chunk-level byte manipulation if you want metadata-chunk injection specifically (a technique you haven't built yet) rather than pixel-level LSB (which you have).

## Check your understanding

- If you wanted to add a hidden \`tEXt\` chunk to a PNG without using a full PNG-parsing library, what four pieces of information would you need to construct correctly for the chunk to be accepted by a standards-compliant reader? (Hint: re-read the chunk structure above.)
`,
  },
];