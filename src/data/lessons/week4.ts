import type { Lesson } from '../../types/curriculum';

export const WEEK_4_LESSONS: Lesson[] = [
  {
    id: 'w4-mime-vs-extension-vs-magic',
    title: 'MIME types vs. File Extensions vs. Magic Numbers',
    summary: 'Three different, independent ways a system decides what a file is - and why they can disagree.',
    estimatedMinutes: 20,
    content: `
## Three separate identity systems

By this point you know a file's *true* type is determined by its magic number (Week 2). But in practice, software juggles **three separate, independently-controlled** signals about a file's type, and understanding that they're independent is what makes deliberate mismatches (and the attacks built on them) possible.

### 1. File extension
The characters after the last \`.\` in a filename. Purely a **naming convention** - the OS shell uses it to pick a default application, but nothing enforces that the content actually matches. Trivially user-controlled; renaming a file changes this instantly with zero validation.

### 2. MIME type (Content-Type)
A string like \`image/png\` or \`application/pdf\`, used primarily in **HTTP responses and email** to tell the receiving application how to interpret a payload, independent of any filename. Critically: **the server or uploader chooses this value and declares it** - it is not derived from inspecting the actual bytes unless the software explicitly does so. A malicious or misconfigured server can declare \`Content-Type: image/png\` while serving bytes that are actually an HTML page containing a \`<script>\` tag - a real, historically significant attack class called **MIME sniffing exploitation**, which is exactly why your project's security notes reference "MIME-sniffing prevention" as a defense (typically implemented via the \`X-Content-Type-Options: nosniff\` HTTP header, which tells browsers "trust the declared Content-Type, don't try to guess from content").

### 3. Magic number
As covered in Week 2 - derived directly from the file's actual bytes. The only one of the three that isn't a *claim*; it's a structural property of the data itself (though, as you'll see below, even this can be deliberately gamed).

## Where the three disagree - and why that matters

\`\`\`
Filename:      "invoice.pdf"        → extension says: PDF
HTTP header:   Content-Type: image/jpeg  → MIME type says: JPEG
First bytes:   25 50 44 46 (%PDF)   → magic number says: PDF
\`\`\`

A naive file-handling system trusting only the extension or only the declared MIME type would misclassify this file. **A defensively-built system checks the magic number as the ground truth**, and treats a mismatch between the three as suspicious by itself - this is precisely the "triple validation" approach referenced in your project's security hardening notes (file-type triple validation), and it's a direct, practical application of everything from Week 2.

## Check your understanding

- Why is magic-number validation alone still not a complete defense (think back to the "matching signature doesn't guarantee validity" question from Week 2)?
- If you were designing Steganaliz's own file-type validation, in what order would you check these three signals, and what would you do on a mismatch - reject the file outright, or just warn the user? What's the tradeoff?
`,
  },
  {
    id: 'w4-polyglot-files',
    title: 'Polyglot files: valid in two formats simultaneously',
    summary: 'How a single file can be a legitimate JPEG and a legitimate ZIP (or script) at the same time - and why parsers disagree about which one it "is."',
    estimatedMinutes: 25,
    content: `
## What makes a polyglot possible

A **polyglot file** is a single byte sequence that different parsers interpret as different, independently valid formats. This isn't a bug in any one format - it's an emergent consequence of the structural facts from Weeks 2–3: different formats look for their defining structure in different places within a file (start, end, or specific offsets), and if two formats' "load-bearing" regions don't overlap, the same bytes can satisfy both simultaneously.

## The classic example: JPEG + ZIP polyglots (GIFAR's descendant)

Recall from Week 2: JPEG decoders read forward from the start, stop at the \`FF D9\` (EOI) marker, and **never look past it**. ZIP archives, by contrast, are read **backward from the end of the file** - a ZIP reader locates the "End of Central Directory" record by scanning from the file's *last* bytes, which then points it to where the central directory (the archive's table of contents) begins.

This creates an opportunity: if you take a valid JPEG and simply **append a valid ZIP archive after its EOI marker**, you get one file that:
- A JPEG viewer opens perfectly - it reads from the front, hits \`FF D9\`, stops, never touches the appended ZIP data.
- A ZIP tool opens perfectly - it reads from the back, finds the End of Central Directory record inside the appended region, and successfully lists/extracts the ZIP's contents, completely ignoring the JPEG bytes at the front as irrelevant leading garbage.

\`\`\`
[========= valid JPEG structure =========][FF D9][========= valid ZIP structure =========]
   ^ JPEG parser reads this, stops here ^          ^ ZIP parser reads from the end, backward ^
\`\`\`

This is structurally the **exact same mechanism** as the EOF-append steganography technique from Week 2/9 - the only difference is *intent and payload validity*. EOF-append steganography appends arbitrary (often encrypted, non-self-describing) bytes; a polyglot appends bytes that are themselves a **complete, independently valid file** in a second format. Your \`eof-append\` engine, once built in Week 9, is one small step away from being a polyglot-construction tool - the difference is purely what you choose to append.

## GIFAR: the named historical example

"GIFAR" refers to a real, documented technique combining a GIF image with a JAR (Java Archive) file - because, like the JPEG/ZIP case, GIF parsers read forward and JAR/ZIP readers read backward from the end. This was used historically to bypass file-upload filters that only checked "is this a valid image" (correctly true!) while smuggling executable Java code past the same check, which would then execute in certain browser plugin contexts that trusted the file based on its declared extension or upload context. This is a textbook illustration of why **validating that a file conforms to *a* format is not the same as validating that it conforms to *only* that format**.

## Practical defense implications

This is exactly why serious file-upload security can't stop at "check the magic number matches the expected type" - a polyglot's magic number check would pass cleanly (the JPEG signature at the front is completely genuine). Real defenses need to either: fully parse the file and verify there's no unexpected trailing data beyond the format's own defined end (an EOF/length consistency check - the same one you identified in Week 2's check-your-understanding), or run the file through a **re-encoding pipeline** that only preserves the semantic content of the expected format and discards everything else - which, not coincidentally, is exactly what your \`stripMetadata()\` engine's canvas re-encode approach does for images: a polyglot JPEG+ZIP, run through \`stripImageMetadata()\`, would emerge as a clean PNG with the appended ZIP data entirely gone, because canvas only ever reads the genuine pixel content and re-emits fresh bytes.

## Check your understanding

- Why does re-encoding (rather than just "scanning and deleting trailing bytes") give a stronger guarantee against polyglots specifically?
- Could a polyglot be constructed between two formats that *both* read forward from the start (like PNG and another chunk-based format)? What would need to be true about their respective header/signature requirements for that to work?
`,
  },
  {
    id: 'w4-metadata-structures',
    title: 'Metadata structures: EXIF, ID3, and COM markers',
    summary: 'The specific, named metadata systems different formats use, and what each stores.',
    estimatedMinutes: 20,
    content: `
## EXIF (Exchangeable Image File Format)

Embedded primarily in JPEG (and TIFF) files, typically inside an \`APP1\` marker segment near the start of the file. EXIF stores camera/device metadata as a structured tag-based system: camera make/model, exposure settings (aperture, shutter speed, ISO), timestamp, orientation, and - significant from a privacy standpoint - **GPS coordinates**, if the capturing device recorded them. This is precisely why "strip EXIF before sharing a photo" is common security advice: a casual photo can silently leak the exact location it was taken.

EXIF's structure is itself a self-describing tag system (an Image File Directory, or IFD) - each tag has a numeric ID, a data type, a count, and a value or offset to the value - meaning EXIF parsing is, structurally, the same "read a length/type, then the data" pattern you've now seen repeatedly across PNG chunks, ZIP records, and MFT entries. This recurring pattern is not a coincidence: it's simply the most robust general solution to "store a variable amount of self-describing structured data," and you'll see it again and again as you read more file formats.

## ID3 (audio metadata, primarily MP3)

Stores artist, album, track title, year, genre, and (in later versions) embedded album artwork. Two structurally distinct eras worth knowing:

**ID3v1**: a fixed 128-byte block at the **very end** of the file - extremely simple, extremely limited (30 characters max per field), and trivially detected/stripped since its position and size are fixed.

**ID3v2**: located at the **start** of the file, using the same self-describing frame-based structure pattern as EXIF's IFDs - variable length, extensible, supports far more field types including embedded images. Most modern MP3s use ID3v2, with some maintaining a legacy ID3v1 block at the end for backward compatibility with older software - meaning a single MP3 can carry **two independent metadata systems simultaneously**, at opposite ends of the file.

## COM markers (JPEG comment segments)

Recall the JPEG marker structure from Week 2: a sequence of \`FF xx\` markers, several of which are explicitly reserved for extension data (\`APPn\` for application-specific data - this is where EXIF actually lives, inside \`APP1\` specifically) and \`COM\` for arbitrary human-readable comments. A \`COM\` marker is about as close to a "no questions asked" data-hiding slot as a format provides *by design* - it exists specifically to hold arbitrary text, has a simple length-prefixed structure, and virtually every JPEG decoder simply skips over it without validation, since it's explicitly non-essential to rendering the image.

## The common thread across all three

Every one of these - EXIF's IFDs, ID3v2's frames, JPEG's \`APPn\`/\`COM\` markers - exists precisely to let a format be **extended without breaking older parsers**: a decoder that doesn't understand a specific tag/frame/marker type simply skips it (using its declared length) and moves on. This same design property that makes formats gracefully extensible is exactly what makes metadata regions a natural, low-friction steganography target - "safely ignorable by design" and "safely exploitable for hiding data" are, structurally, the same property viewed from two different angles.

## Check your understanding

- Given that ID3v1 sits in a *fixed* 128-byte block at a *fixed* offset from the end of the file, is it a better or worse steganographic hiding spot than ID3v2's variable, extensible frame structure? Consider both capacity and detectability.
- Why would a forensic tool specifically flag an MP3 containing *both* ID3v1 and ID3v2 metadata blocks with conflicting information (e.g., different artist names) as worth investigating further?
`,
  },
];