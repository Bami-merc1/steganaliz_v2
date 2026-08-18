export interface DocSection {
  id: string;
  title: string;
  content: string; // markdown-compatible
}

export interface DocChapter {
  id: string;
  title: string;
  icon: string;
  sections: DocSection[];
}

export const DOCUMENTATION: DocChapter[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: '◎',
    sections: [
      {
        id: 'what-is-steganaliz',
        title: 'What is Steganaliz?',
        content: `
Steganaliz is a **browser-based steganography and steganalysis workbench** - a unified tool for hiding secret messages inside ordinary files (steganography) and for detecting whether a file contains hidden data (steganalysis).

Unlike most existing tools which are either embedding-only or detection-only, Steganaliz provides both capabilities in a single interface, covering more than **40 file formats** across images, audio, video, documents, code files, and binaries.

**The most important thing to understand about Steganaliz:** every operation - embedding, extraction, detection, encryption - happens entirely inside your browser. No file content, no message, no password, and no analysis result is ever sent to any server. Nothing leaves your device.
        `,
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        content: `
At its core, Steganaliz exploits a fundamental property of digital files: most file formats contain **redundant data** - bits and bytes that can be altered slightly without meaningfully changing the file's visible or audible content.

**Embedding** works by hiding payload bits inside these redundant positions. For example, the least significant bit (the lowest-order bit, worth only ±1 out of 256 values) of an image's pixel colour channels can be overwritten with hidden message bits, and a human eye cannot detect the difference.

**Extraction** reverses this exactly - it reads back the same bit positions in the same order and reconstructs the original hidden payload.

**Detection** works statistically. Embedding disturbs the natural distribution of values in a file in measurable ways - a process known as the "flattening effect." Steganaliz's ten-detector suite measures different aspects of this disturbance and combines their results into a single weighted confidence score.

All of this runs inside your browser using standard web platform APIs: the **Canvas API** for pixel manipulation, the **Web Crypto API** for encryption, and standard **JavaScript typed arrays** for byte-level file processing.
        `,
      },
      {
        id: 'target-audience',
        title: 'Who is this for?',
        content: `
Steganaliz is designed for several overlapping audiences:

**Cybersecurity students and learners**
The Training tab provides a complete 15-week university-level curriculum covering binary fundamentals, file forensics, steganography techniques, and steganalysis - from absolute beginner to advanced. Every lesson is connected to the app's own code, so you learn the theory and immediately see it working.

**CTF (Capture the Flag) competitors**
The CTF Mode tab provides multi-technique extraction, wordlist brute-forcing against encrypted payloads, and hex preview - the standard first-pass toolkit for steganography challenges.

**Digital forensics professionals**
The Forensics tab provides an entropy heatmap visualizer, a bitplane inspector, and a forensic report exporter (PDF and .txt) suitable for inclusion in investigation records. The Detect tab runs ten independent statistical and structural detectors and combines them into a probabilistic verdict.

**Privacy-conscious individuals**
Steganaliz enables deniable, low-visibility communication - a hidden message inside an ordinary image or audio file, protected by AES-256-GCM encryption, is extremely difficult to detect. Because all processing is local, you never have to hand your files or passwords to any third party.

**Educators and researchers**
The open-source architecture, fully documented algorithm implementations, and training curriculum make Steganaliz a practical teaching and research reference for steganography and steganalysis courses.
        `,
      },
      {
        id: 'architecture',
        title: 'System architecture',
        content: `
Steganaliz is built as a layered, modular React application with no backend:

**UI Layer** (components/)
Tab-based views for each operation mode, shared form components (dropzones, file info cards, verdict banners), and the layout shell. State is managed with Zustand - lightweight stores for session history, file state, and UI state.

**Engine Layer** (engines/)
Format-specific embedding and extraction implementations, organized by media type:
- \`engines/image/\` - PNG/BMP LSB (sequential), PNG/BMP LSB (randomized, CSPRNG-seeded), PNG metadata-chunk injection
- \`engines/audio/\` - WAV 16-bit PCM LSB
- \`engines/binary/\` - EOF-append (any format)

Every engine implements the same contract: \`embed(file, message, password?) → Promise<Blob>\` and \`extract(file, password?) → Promise<string>\`. The format router dispatches to the right engine automatically based on file extension.

**Detector Layer** (detectors/)
Ten independent steganalysis detectors, each implementing \`detect(file) → Promise<{score, label, details}>\`. The verdict engine runs all applicable detectors in parallel and combines their scores using a weighted average.

**Utility Layer** (utils/)
AES-256-GCM + PBKDF2 cryptography, file validation (triple: extension + MIME + magic bytes), SVG sanitization, rate limiting, and the seeded PRNG for randomized LSB pixel ordering.

**Data Layer** (data/)
The complete 15-week training curriculum - 34 lessons across 4 phases - stored as TypeScript content files and loaded lazily as a separate build chunk.
        `,
      },
    ],
  },
  {
    id: 'workbench',
    title: 'Workbench',
    icon: '⚒',
    sections: [
      {
        id: 'embed',
        title: 'Embed - hiding a message',
        content: `
The **Embed tab** is where you hide a secret message inside a carrier file.

**Step-by-step:**

1. **Drop or select a carrier file.** Steganaliz validates the file immediately - checking the file extension, declared MIME type, and the actual magic bytes at the start of the file against known signatures. If these three don't agree, the file is rejected before any processing begins.

2. **Choose a technique.** Based on the file type, one or more embedding techniques become available. For PNG and BMP files you can choose between sequential LSB, randomized LSB (password-seeded), or metadata chunk injection. For WAV files, audio sample LSB is used. For all other supported formats, EOF-append is used.

3. **Type your secret message.** A live capacity counter shows how many bytes are available for the current file and technique, and a progress bar fills as you type. The message cannot exceed the displayed capacity.

4. **Optionally encrypt.** The encryption checkbox (enabled by default) wraps the payload in AES-256-GCM authenticated encryption before embedding. You supply a password (minimum 8 characters). This means even if someone discovers that a stego file contains hidden data, they cannot read it without the password.

5. **Click Embed & download.** The stego file is generated as a Blob entirely in your browser and automatically downloaded. Image files (PNG/BMP) are always re-encoded as PNG. All other formats retain their original extension.

**Technique guide:**

*LSB (sequential)* - Bits are written into pixel/sample channels in raster order (top-left to bottom-right). Simple and fast. A bitplane visual analysis can detect sequential payloads that don't fill the image.

*LSB (randomized)* - Bit positions are shuffled using a password-derived pseudo-random permutation. Defeats visual bitplane analysis. Always requires a password (the password is what determines where the bits are stored - without it, extraction is infeasible).

*Metadata chunk injection (PNG)* - Embeds the payload as a custom ancillary chunk inside the PNG file structure. Doesn't touch any pixel data at all. The file's visual content is completely unchanged even at the bit level.

*EOF-append* - Appends the payload after the carrier file's own end-of-format marker. Supported for any file type. The carrier opens and displays normally in any viewer, because every standard parser stops reading at the format's own end marker and never sees the appended data.

*WAV audio LSB* - Writes payload bits into the least significant bits of 16-bit PCM audio samples. Inaudible to human hearing (a ±1 shift in amplitude out of 32,768 possible values). Preserves the WAV file structure and audio content completely.
        `,
      },
      {
        id: 'extract',
        title: 'Extract - recovering a message',
        content: `
The **Extract tab** recovers a hidden message from a stego file you previously embedded.

**Step-by-step:**

1. **Drop or select the stego file.** The file is validated the same way as in the Embed tab.

2. **Select the technique.** Steganaliz auto-selects the most likely technique for the file type, but if you know the exact technique used (e.g. the file was embedded with randomized LSB rather than sequential), you can switch using the technique buttons.

3. **Enter a password if needed.** If the payload was encrypted, the first extraction attempt (without a password) will return an error message noting that a password is required. Enter the password and try again. For randomized LSB files, the password field appears immediately because the password is required to determine where the bits are even located, not just to decrypt.

4. **Click Extract payload.** The recovered message appears in a plain-text display panel. It is always rendered as inert text - never as HTML - so a malicious payload cannot execute as a script inside the application.

5. **Copy to clipboard** using the button below the recovered message.

**Important notes:**
- Extract only works if the file was embedded using Steganaliz's own engines. Files embedded by other tools (Steghide, OpenStego, etc.) use different framing formats and will not extract correctly.
- The technique selected in Extract must match the technique used in Embed. If the wrong technique is selected, you will receive either "no valid payload detected" or garbage output.
- For randomized LSB files, the correct password must be supplied before extraction can even begin, because the password derives the channel order that locates the payload.
        `,
      },
      {
        id: 'detect',
        title: 'Detect - steganalysis',
        content: `
The **Detect tab** analyses a suspect file using ten independent steganalysis detectors and combines their results into a single weighted verdict.

**Running a detection:**

1. Drop or select any supported file.

2. Click **Run detection.**

3. Each applicable detector runs and returns an individual score (0–100%) and label.

4. The verdict engine combines all applicable scores using a weighted average into one of three overall labels:

| Label | Score range | Meaning |
|---|---|---|
| CLEAN | 0–39% | No statistically significant anomalies detected |
| SUSPICIOUS | 40–69% | One or more detectors flagged statistical deviations |
| STEGO | 70–100% | Strong multi-detector evidence of embedded payload |

**The ten detectors:**

*Entropy analyzer* (weight 0.6) - Measures the Shannon entropy (randomness) of the file's bytes. Embedded or encrypted data pushes entropy toward its theoretical maximum (8 bits/byte). Weighted lower than other detectors because legitimately compressed or encrypted files can also show high entropy, producing false positives.

*Chi-square attack* (weight 1.0) - Analyses the frequency distribution of adjacent pixel value pairs. LSB embedding causes a "flattening effect" that pushes each pair toward a 50/50 split - an artificial pattern absent in natural images.

*Regular-Singular (RS) analysis* (weight 1.0) - Groups adjacent pixels and classifies them as Regular or Singular based on how a standard flip mask affects their smoothness. Natural images have a reliable R > S asymmetry; LSB embedding disrupts this.

*LSB ratio test* (weight 0.9) - Counts the proportion of LSBs that are 1 vs. 0. Natural images rarely show an exactly 50/50 split; a random payload pushes this toward perfect balance.

*Histogram analysis* (weight 0.9) - Measures the "roughness" of the colour value histogram. LSB embedding smooths out natural value-to-value variation.

*Sample pair analysis* (weight 1.0) - Examines adjacent-sample pairs for LSB disruption of natural correlation.

*EOF append detector* (weight 1.4) - Scans for Steganaliz's own EOF-append magic marker. A near-certain signal - high weighted because it is close to binary (either present or absent).

*Header consistency check* (weight 0.7) - Compares the file's actual magic bytes against what its extension claims. A mismatch is independently suspicious.

*Metadata inspector* (weight 0.8) - Parses PNG chunk structure, flags non-standard chunk types (like Steganaliz's own \`stGz\` metadata-injection chunks), and flags unusually large text-chunk payloads.

*Signature fingerprinter* (weight 1.4) - Scans the file for known Steganaliz tool signatures (\`STGZAPND\`, \`stGz\`, \`stSl\`). Near-certain signal when matched, weighted equivalently to the EOF detector.

**Understanding the results:**
Detection is probabilistic, not definitive. A STEGO verdict means strong statistical evidence - it does not constitute forensic proof. A CLEAN verdict means no significant anomalies were found - it does not rule out a sophisticated adaptive embedding technique that deliberately avoids these detectors.
        `,
      },
      {
        id: 'batch',
        title: 'Batch - processing multiple files',
        content: `
The **Batch tab** applies embed or detect operations across up to 25 files in a single run.

**Batch detect:**

Drop or add up to 25 files. Click **Run batch detect.** Each file is processed sequentially through the full ten-detector suite. Results display per-file verdict labels and confidence scores as they complete. Useful for quickly triaging a folder of suspect files.

**Batch embed:**

Type a single secret message (it is applied to every file in the batch). Click **Run batch embed.** All successfully embedded files are collected in memory and downloaded as a single **.zip archive** - avoiding the browser's multiple-download permission prompt and keeping output organized.

**Per-row status indicators:**

Each file row shows one of four states: *pending* (queued), *processing* (running), *done* (completed successfully), *error* (failed, with a reason). Files that fail (e.g., unsupported format for the selected engine) are excluded from the zip without stopping the rest of the batch.

**Limitations:**

- Batch embed uses the same message for every file. Per-file messages or passwords are not supported in the current release.
- Encryption is not available in batch embed mode.
- Only PNG and BMP files use the LSB engine in batch embed. All other file types use EOF-append.
        `,
      },
      {
        id: 'metadata',
        title: 'Metadata - stripping hidden file data',
        content: `
The **Metadata tab** produces a "clean" copy of a file with all metadata and non-essential embedded data removed.

**What it strips (for images):**

For PNG, BMP, JPG, and GIF files, the tool re-encodes the image through a clean HTML5 Canvas pixel buffer. This process is essentially a controlled information lossy step - only the raw pixel values (what the image actually looks like) survive into the output.

Everything else is discarded:
- **EXIF data** - camera model, lens settings, software, creation timestamp
- **GPS coordinates** - location where the photo was taken
- **ICC colour profiles**
- **XMP metadata** - Adobe's extended metadata standard
- **Non-standard PNG chunks** - including steganographic payload chunks (e.g. Steganaliz's own \`stGz\` or \`stSl\` chunks)
- **Any data appended after the format's end marker** (EOF-append payloads)

**Why output might be larger than input:**
PNG re-encoding is always lossless. The output file contains only genuine pixel data, but PNG's compression algorithm re-applied to that data may not produce a smaller file than the original - especially if the original was already well-compressed. The value of metadata stripping is in **removing hidden data**, not in reducing file size.


**Other formats:**
Format-specific metadata stripping for PDF (metadata dictionary), MP3 (ID3 tags), DOCX (core.xml), and other document formats is on the development roadmap. Currently, non-image files pass through unchanged with a clear notice.
        `,
      },
      {
        id: 'history',
        title: 'History - session audit trail',
        content: `
The **History tab** displays a chronological log of every embed, extract, detect, batch, and metadata-strip operation performed during the current browser session.

Each entry records:
- The operation type
- The filename processed
- A short detail string (technique used, bytes embedded, verdict score, etc.)
- A timestamp (hours:minutes:seconds)

**Privacy design:**
The history log is stored only in memory - it is never written to localStorage, IndexedDB, or any persistent storage. It is permanently and irrecoverably cleared the moment you close the tab or navigate away. This is intentional: a tool whose entire premise is secrecy should not leave a persistent record of what files you analysed.

**Clearing manually:**
Click the **Clear history** button to wipe the log within the current session.
        `,
      },
      {
        id: 'ctf',
        title: 'CTF Mode - challenge solving',
        content: `
The **CTF Mode tab** is a dedicated interface for Capture the Flag steganography challenge solving.

**Hex preview:**
Every file you drop is immediately displayed as a hex dump of its first 256 bytes. This lets you quickly identify: the file's actual type from its magic bytes (Week 2 of the Training curriculum covers magic numbers in depth), known tool signatures, and structural anomalies near the file's start.

**Multi-technique extraction:**
On clicking **Run multi-technique extraction**, Steganaliz automatically tries every registered engine that supports the file's extension, in sequence:

1. Attempt extraction without a password (unencrypted payload)

2. If the engine reports "payload is encrypted, password required", proceed to the wordlist

3. Try each wordlist password against that engine

4. Move to the next engine

This means a single click tests multiple embedding techniques and multiple passwords automatically, rather than requiring you to manually try each combination.

**Wordlist brute-forcing:**
Paste one password per line into the wordlist box before running. Common CTF wordlists (rockyou, common passwords, challenge-specific words) can be pasted directly. Extraction stops as soon as a successful result is found and displays the recovered message.

**When to use CTF Mode vs. Extract:**
Use the regular Extract tab when you know exactly which technique and password were used. Use CTF Mode when you're uncertain - it's slower (tries multiple options) but requires less prior knowledge.
        `,
      },
    ],
  },
  {
    id: 'forensics',
    title: 'Forensics',
    icon: '',
    sections: [
      {
        id: 'entropy-heatmap',
        title: 'Entropy Heatmap',
        content: `
The **Entropy Heatmap** divides an image into 16×16 pixel blocks, computes the Shannon entropy of each block's RGB byte values, and maps those entropy values to a colour scale - cool blues for low-entropy (natural, predictable content) through greens and yellows to hot reds for high-entropy (random-looking, potentially embedded or encrypted content).

**Reading the heatmap:**
- A completely natural, unmanipulated photograph will show a heatmap that roughly correlates with visual complexity - sky and flat surfaces show cool colours, detailed textures and edges show warmer colours - with no sharp rectangular boundaries.
- An image with a **sequentially embedded** payload (the default embedding order in Steganaliz's LSB engine) will often show a distinctly warmer rectangular region in the top-left area of the heatmap, corresponding to the contiguous block of pixel channels that were overwritten with payload bits. The boundary between the embedded region and the untouched region can be visually obvious at low-to-medium capacity usage.
- An image embedded using **randomized LSB** will not show a concentrated warm region - the entropy contribution is spread evenly across the whole image - but the mean entropy of the whole image may be slightly higher than a clean equivalent.

**Statistics panel:**
Min, mean, and max entropy values across all blocks are displayed alongside the heatmap, giving a numerical baseline alongside the visual.


**Supported files:** PNG, JPG, BMP, GIF, WEBP (any raster image format decodable by the browser's built-in image decoder).
        `,
      },
      {
        id: 'bitplane-inspector',
        title: 'Bitplane Inspector',
        content: `
The **Bitplane Inspector** extracts a single bit position from a single colour channel of an image and renders it as a black-and-white image, where white = bit is 1 and black = bit is 0.

**Bit positions:**
Each 8-bit colour channel has 8 bit positions, numbered 0 (least significant / LSB) to 7 (most significant / MSB). The MSB carries most of the visual information - bitplane 7 looks like a recognizable, high-contrast silhouette of the original image. The LSB normally looks like random visual noise, because natural pixel data's lowest bits don't correlate with any meaningful visual structure.

**What to look for:**
- **Natural (clean) LSB plane (bit 0):** Uniform, unstructured visual noise with no patterns. No rectangular boundaries, no repeating structures.
- **Sequential LSB payload:** A sharp, rectangular boundary is visible, separating a region of "structured noise" (where encrypted payload bits were written) from the natural noise of the untouched remainder. The structured noise looks slightly different from natural image noise - encrypted content approaches maximum entropy and has a different visual texture.
- **Randomized LSB payload:** No visible boundary (the bits are scattered), but the noise texture across the whole plane may be subtly more uniform than a clean image.

**Spatial anomaly score:**
A numerical anomaly score is computed from the bitplane's spatial correlation and 0/1 balance, displayed below the rendered plane. Scores above 40% on bit 0 are flagged as worth investigating further with the full detector suite.
        `,
      },
      {
        id: 'forensic-report',
        title: 'Forensic Report',
        content: `
The **Forensic Report** tool runs the full ten-detector steganalysis suite against a file and compiles the results into a formatted report suitable for inclusion in a digital forensics investigation record.

**Report contents:**
- File identification (name, size, type, analysis timestamp)
- Overall verdict (CLEAN / SUSPICIOUS / STEGO) with confidence score
- Per-detector breakdown (name, label, score, details string, applicable flag)
- EOF-append marker detection result
- Any file validation notes (e.g. magic byte mismatches)
- Methodology notes describing each detector
- A formal forensic disclaimer noting the probabilistic nature of the results

**Export formats:**
- **Download PDF** - A formatted, multi-page A4 PDF document generated entirely client-side using the pdf-lib library. Includes an orange-accented header, a colour-coded verdict badge, a structured detector results table, and per-page page numbering and footer.
- **Download .txt** - A plain-text version of the same report, suitable for pasting into investigation notes or attaching to tickets.

**Forensic disclaimer:**
All reports include a mandatory disclaimer: steganalysis results are probabilistic and must not be treated as conclusive forensic evidence without independent expert verification. This is reproduced in the report's PDF and text output, and is a requirement for any tool output used in a formal investigative context.
        `,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: '',
    sections: [
      {
        id: 'encryption',
        title: 'AES-256-GCM encryption',
        content: `
Steganaliz's optional payload encryption uses **AES-256-GCM** (Advanced Encryption Standard in Galois/Counter Mode) - an authenticated symmetric encryption scheme that provides both confidentiality (nobody can read the payload without the key) and integrity (any tampering with the encrypted payload causes decryption to fail detectably, rather than silently producing garbage).

**Key derivation (PBKDF2-SHA256):**
The password you type is never used as an encryption key directly. Instead, it is fed into **PBKDF2** (Password-Based Key Derivation Function 2) with:
- A randomly generated 32-byte (256-bit) salt, unique to each encryption operation
- 310,000 iterations of HMAC-SHA256
- An output key length of 256 bits

310,000 iterations is the OWASP-recommended minimum as of 2021–2023. This iteration count means that even on fast hardware (a modern GPU), brute-force guessing passwords is extremely slow - each password guess requires 310,000 hash computations.

**IV (nonce) generation:**
A random 96-bit initialization vector is generated fresh for each encryption. Reusing an IV with the same key in GCM mode is a critical cryptographic vulnerability - Steganaliz generates a new random IV for every single encryption operation, making IV reuse structurally impossible.

**Framing:**
The encrypted output is stored as: \`[salt (32 bytes)] [IV (12 bytes)] [ciphertext + GCM auth tag (N+16 bytes)]\`. The salt and IV are stored unencrypted (they must be readable to perform decryption) but are not secret - their randomness is what prevents attacks, not their secrecy.

**Web Crypto API:**
All cryptographic operations use the browser's native **Web Crypto API** - a standard, audited, hardware-accelerated cryptographic implementation provided by the browser engine itself. No third-party cryptographic library is used anywhere in Steganaliz.
        `,
      },
      {
        id: 'client-side',
        title: 'Client-side only architecture',
        content: `
**Nothing leaves your device.** This is Steganaliz's primary security and privacy guarantee, and it's not a policy claim - it's a structural fact of the application's architecture.

Steganaliz has no backend server. There is no API endpoint, no database, no file upload route, no logging infrastructure, and no analytics service. The application is a collection of static HTML, CSS, and JavaScript files served from a CDN. After the initial page load, your browser makes zero network requests during normal operation.

You can verify this yourself: open your browser's developer tools, switch to the Network tab, and perform any embed or detect operation. You will see no outgoing requests to any server.

**What this means in practice:**
- Your files never leave your machine in any form
- Your passwords are never transmitted anywhere
- Your hidden messages are never seen by anyone but you
- Your analysis results are not logged or retained
- Session history (the History tab) is held in memory only and cleared when the tab closes

**Comparison with online steganalysis services:**
Popular free online steganalysis services (Aperisolve, FotoForensics) require you to upload your suspect file to their server for analysis. For legitimate forensic investigation (where chain of custody matters), privacy-conscious communication (where the file content is sensitive), or security research (where the file may itself be malicious), this is a significant limitation that Steganaliz's architecture eliminates entirely.
        `,
      },
      {
        id: 'defenses',
        title: 'Security defenses',
        content: `
Steganaliz was hardened against common client-side web application attack classes as a first-class design requirement, not as an afterthought.

**File-type triple validation**
Every carrier file is validated at three levels before processing begins: (1) file extension against a strict allowlist, (2) declared MIME type checked against a list of dangerous types, (3) actual file magic bytes compared against known signatures for the claimed format. A file that fails any of these three checks is rejected with a clear message before any engine touches it.

**Zip bomb protection**
ZIP-based formats (DOCX, PPTX, XLSX, ODT, ZIP) are scanned before decompression. If the ratio of claimed uncompressed size to actual file size exceeds 100×, the file is rejected as a potential zip bomb - a type of resource exhaustion attack where a small file expands to gigabytes when decompressed.

**XSS prevention on extracted payloads**
Extracted message content is always rendered in a \`<pre>\` element as plain text. It is never passed to \`innerHTML\`, \`dangerouslySetInnerHTML\` (except for the documentation and training content, which is generated from our own hardcoded files, not from user input), or any other HTML-executing context. A malicious payload containing \`<script>alert(1)</script>\` is displayed as literal text, not executed.

**SVG sanitization**
SVG files are sanitized before processing. Any \`<script>\` elements, event-handler attributes (\`onclick\`, \`onload\`, \`onerror\`, etc.), and \`javascript:\` URI attributes are stripped before the file is passed to any engine.

**Content Security Policy (CSP)**
A strict CSP is enforced via both HTTP header (on the production deployment) and meta tag: no inline scripts, no external script sources, no eval. This limits the damage any XSS vulnerability could cause even if one were somehow introduced.

**Clickjacking and MIME-sniffing prevention**
\`X-Frame-Options: DENY\` and \`X-Content-Type-Options: nosniff\` headers prevent the app from being framed by an attacker page, and prevent browsers from "sniffing" content types in ways that could be exploited.

**Timing attack mitigation**
AES-GCM decryption failure (wrong password or tampered ciphertext) introduces a randomized delay of 150–400ms before the error is returned. This prevents an attacker from learning whether a password is "close" to correct by measuring how quickly decryption fails.

**Rate limiting**
Client-side rate limits are enforced per operation type: 10 embeds/minute, 20 detections/minute, 10 extractions/minute, 3 batch runs/minute. This prevents resource exhaustion from rapid automated calls.

**HTTPS / HSTS**
The production deployment enforces HTTPS with a Strict-Transport-Security header (\`max-age=63072000; includeSubDomains; preload\`), ensuring all connections to the application are encrypted in transit.
        `,
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Reference',
    icon: '⚙',
    sections: [
      {
        id: 'supported-formats',
        title: 'Supported formats',
        content: `
**Images**
PNG, BMP - LSB pixel substitution (sequential or randomized), PNG metadata-chunk injection, EOF-append
JPG/JPEG - EOF-append, detection (chi-square, histogram, LSB ratio, sample pair, RS analysis)
GIF, SVG - EOF-append, detection

**Audio**
WAV (16-bit PCM only) - LSB audio sample substitution, EOF-append
MP3 - EOF-append

**Video**
MP4 - EOF-append

**Documents**
PDF, DOCX, DOTX, DOCM, PPTX, ODT, OTT, RTF, DOC - EOF-append
MD, TXT, LOG - EOF-append

**Code and markup**
PY, JS, JSX, TS, TSX, CSS, HTML, XML, CSV, JSON - EOF-append

**Binary**
EXE, BIN, ISO, APK, ZIP, PEM - EOF-append

**Format notes:**
- JPEG cannot use pixel LSB because JPEG's lossy compression destroys arbitrary bit-level changes on re-save. Only lossless formats (PNG, BMP, WAV) support spatial/amplitude-domain LSB embedding.
- WAV support is limited to 16-bit PCM encoding. 8-bit, 24-bit, 32-bit float, and compressed WAV variants are rejected with a clear error.
- Maximum file size: 100 MB per file.
        `,
      },
      {
        id: 'capacity',
        title: 'Capacity and limits',
        content: `
**PNG/BMP LSB capacity:**
\`capacity_bytes = floor((pixel_count × 3 − 40) / 8)\`

3 channels per pixel (R, G, B - alpha is skipped to avoid visible transparency shifts), 1 bit per channel, minus 40 bits of header overhead (8-bit encryption flag + 32-bit length prefix).

Example: a 512×512 image has 262,144 pixels × 3 = 786,432 usable bits − 40 = 786,392 bits ÷ 8 = **98,299 bytes (~96 KB)** maximum payload.

**WAV LSB capacity:**
\`capacity_bytes = floor((sample_count − 40) / 8)\`

1 bit per 16-bit sample, minus 40-bit header. A 44.1 kHz stereo WAV file has 44,100 × 2 = 88,200 samples per second. One minute of audio provides **660,000 bytes (~645 KB)** of capacity.

**EOF-append capacity:**
Effectively unlimited - the payload is appended after the file's own structure and the file size is the only practical constraint (subject to the 100 MB maximum).

**Encryption overhead:**
AES-256-GCM adds exactly **44 bytes** of overhead per encryption: 32-byte salt + 12-byte IV. The GCM authentication tag (16 bytes) is included in the ciphertext length, not separately.

**PNG metadata-chunk capacity:**
The PNG chunk length field is a 32-bit unsigned integer, giving a theoretical maximum of ~4 GB per chunk. In practice, capacity is limited only by browser memory and the 100 MB file size cap.
        `,
      },
      {
        id: 'payload-framing',
        title: 'Payload framing format',
        content: `
All Steganaliz engines use a consistent framing format for the embedded payload, regardless of technique. This allows the extract engine to correctly read back the payload without needing out-of-band knowledge about its length or encryption status.

**Standard framing (LSB engines, WAV, metadata-chunk):**

\`[1-byte flag] [4-byte big-endian length] [payload bytes]\`

- **Flag byte:** \`0x00\` = payload is unencrypted plaintext UTF-8; \`0x01\` = payload is AES-256-GCM encrypted
- **Length word:** 4 bytes, big-endian unsigned integer, stores the byte length of the payload (post-encryption if applicable)
- **Payload:** the actual bytes - either raw UTF-8 text or the AES-GCM framed ciphertext

Total header overhead: **5 bytes = 40 bits.**

**EOF-append framing:**

\`[8-byte magic marker] [1-byte flag] [4-byte length] [payload bytes]\`

The magic marker is the ASCII string \`STGZAPND\`. The extraction engine scans backward from the end of the file for this marker, then reads the flag and length as above. The marker makes it possible to locate the payload reliably even if the carrier file has trailing data of its own.

**AES-GCM ciphertext framing (when flag = 0x01):**

\`[32-byte salt] [12-byte IV] [ciphertext bytes] [16-byte GCM auth tag]\`

The salt and IV are prepended to the ciphertext so that extraction can derive the correct key and nonce without any separate storage.
        `,
      },
      {
        id: 'browser-support',
        title: 'Browser support',
        content: `
Steganaliz requires a modern browser with full support for:
- **Web Crypto API** (for AES-256-GCM and PBKDF2)
- **Canvas API and \`createImageBitmap\`** (for pixel-level image processing)
- **ES2020+ JavaScript** (for optional chaining, BigInt, etc.)
- **File API and Blob API** (for file reading and download)

**Supported browsers:**
- Chrome / Chromium 90+
- Firefox 88+
- Safari 15+
- Edge 90+

**Not supported:**
- Internet Explorer (any version)
- Opera Mini (limited JavaScript engine)
- Very old mobile browsers

**Mobile:**
Steganaliz is fully functional on modern mobile browsers (Chrome for Android, Safari on iOS 15+). The interface is responsive with a collapsible sidebar navigation. File picking works through the standard mobile file picker. Drag-and-drop is not available on most mobile browsers, but tap-to-browse works correctly.

**PWA installation:**
Steganaliz can be installed as a Progressive Web App on supported platforms (Chrome on Android/Windows, Safari on iOS). Tap the browser's "Add to Home Screen" or "Install" option to install it. Installed PWAs run in standalone mode without the browser chrome.
        `,
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: '?',
    sections: [
      {
        id: 'faq-main',
        title: 'Frequently asked questions',
        content: `
**Can I use Steganaliz to detect files embedded by other tools (Steghide, OpenStego)?**
The statistical detectors (entropy, chi-square, RS analysis, LSB ratio, histogram, sample pair) are general-purpose and will flag anomalies regardless of which tool produced them. However, the signature fingerprinter and EOF-append detector only recognize Steganaliz's own embedding markers. Detection of third-party tool output depends on which detectors fire.

**Why is the stripped file larger than the original?**
When an image is stripped of metadata, Steganaliz re-encodes it as a fresh PNG through a canvas pixel buffer. PNG compression applied to the clean pixel data may not match the original file's compression efficiency, particularly if the original was compressed with a more aggressive tool. The output is structurally cleaner - it contains only pixel data and no hidden content - but may be larger in bytes.

**Why can't I embed a message in a JPEG?**
JPEG uses lossy compression - when you save a JPEG file, the encoder discards information it considers imperceptible to achieve a smaller file. Any arbitrary bits you wrote into the decoded pixel buffer would be destroyed or corrupted by the compression step on re-save. Only lossless formats (PNG, BMP) support reliable pixel-level LSB embedding. JPEG files can still carry EOF-appended payloads, since those are added after the file structure and aren't touched by re-encoding.

**What happens if I forget the password for an encrypted file?**
There is no password recovery. The encryption uses AES-256-GCM with PBKDF2 key derivation at 310,000 iterations. Without the correct password, decryption is computationally infeasible with any known technology. Keep your password safe - there is no backdoor, no recovery key, and no support channel that can help you.

**Is Steganaliz suitable for forensic evidence?**
Steganaliz is suitable as a first-pass investigative triage tool. Its forensic report export is formatted for inclusion in investigation records. However, all report output includes a mandatory disclaimer: results are probabilistic and must not be treated as conclusive forensic evidence without independent verification by a qualified forensic expert. Steganaliz's output should inform further investigation, not substitute for it.

**Can I use this offline?**
After the initial page load (which requires internet to fetch the application files and the Inter/JetBrains Mono fonts from Google Fonts), all processing works completely offline. If you install Steganaliz as a PWA, it caches the application files and is available without any internet connection after installation (fonts may fall back to system defaults offline).

**Is my data stored anywhere?**
No. The only data Steganaliz stores locally is your acceptance of the Terms of Use (in \`localStorage\`, as a single flag with no personal data content). Session history (the History tab) is held in memory only. Everything else - files, messages, passwords, results - exists only in active JavaScript memory during your session and is gone when the tab closes.

**How do I report a bug or security issue?**
Steganaliz is an academic final year project. For security vulnerability reports, please contact the project author directly through the institution rather than posting publicly.
        `,
      },
    ],
  },
];