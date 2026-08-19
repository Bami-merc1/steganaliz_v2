export interface DocSection {
  id: string;
  title: string;
  content: string;
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
    icon: '',
    sections: [
      {
        id: 'what-is',
        title: 'What is Steganaliz?',
        content: `
Steganaliz is a **browser-based steganography and steganalysis workbench** - a unified tool for hiding secret messages inside ordinary files, and for detecting whether a file already contains hidden data.

**Key facts:**
- Works on **40+ file formats** - images, audio, video, documents, code, binaries
- **Everything runs in your browser.** No server. No uploads. No data ever leaves your device.
- Combines **embedding, extraction, detection, encryption,** and **forensic analysis** in one place

**Steganography** hides the existence of a message, not just its content - this is what separates it from encryption, which scrambles content but makes it obvious a secret exists.

**Steganalysis** is the detective work: statistically analysing files to determine whether hidden data is present.
        `,
      },
      {
        id: 'who-is-it-for',
        title: 'Who is it for?',
        content: `
| Audience | Use case |
|---|---|
| **Cybersecurity students** | Learn steganography hands-on alongside the built-in 15-week curriculum |
| **CTF competitors** | Multi-technique extraction, wordlist brute-forcing, hex inspection |
| **Digital forensics professionals** | 10-detector steganalysis, entropy heatmap, forensic PDF reports |
| **Privacy-conscious individuals** | Hide encrypted messages in ordinary files - locally, with no third party |
| **Educators & researchers** | Open-source reference implementation with documented algorithms |

**Steganaliz is not suitable for** evading lawful oversight, hiding illegal content, or any unauthorised access to systems or data. See the Terms of Use.
        `,
      },
      {
        id: 'privacy',
        title: 'Privacy guarantee',
        content: `
**Nothing leaves your device.** This is not a policy claim - it is a structural fact.

Steganaliz has no backend, no API, no database, and no analytics. After the page loads, your browser makes **zero network requests** during any operation.

You can verify this: open DevTools → Network tab → perform any embed or detect. No outgoing requests.

**What this means:**
- Files are never uploaded anywhere
- Passwords are never transmitted
- Session history clears when you close the tab
- There is no account, no login, no data retention
        `,
      },
    ],
  },
  {
    id: 'workbench',
    title: 'Workbench',
    icon: '',
    sections: [
      {
        id: 'embed',
        title: 'Embed',
        content: `
**Purpose:** Hide a secret message inside a carrier file.

**How to use:**

1. Drop a carrier file (PNG, WAV, PDF, etc.)

2. Select an embedding technique - auto-selected based on file type

3. Type your secret message

4. Optionally enable AES-256-GCM encryption with a password

5. Click **Embed & download**

The stego file downloads automatically. Image files always output as PNG.

**Available techniques:**

| Technique | Best for | How it works |
|---|---|---|
| LSB sequential | PNG, BMP | Writes bits into pixel channels in raster order |
| LSB randomized | PNG, BMP | Shuffles pixel order using a password-derived sequence |
| Metadata chunk | PNG | Inserts payload as a custom PNG chunk - pixels untouched |
| WAV audio LSB | WAV | Writes bits into the LSBs of 16-bit PCM samples |
| EOF append | Any format | Appends payload after the file's own end marker |

**Encryption:** When enabled, the payload is encrypted with AES-256-GCM before embedding. Without the password, the data cannot be decrypted even if someone finds it. See the Security section for full details.
        `,
      },
      {
        id: 'extract',
        title: 'Extract',
        content: `
**Purpose:** Recover a hidden message from a stego file.

**How to use:**

1. Drop the stego file

2. Select the technique that was used to embed it

3. Enter the password if the payload was encrypted

4. Click **Extract payload**

The recovered message appears as plain text - never rendered as HTML, so malicious content cannot execute.

**Common errors:**

| Error | Cause |
|---|---|
| No valid payload detected | Wrong technique selected, or file was not embedded by Steganaliz |
| Password required | Payload was encrypted - enter the password first |
| Decryption failed | Incorrect password, or file was tampered with |
| No randomized-LSB salt chunk found | File was not embedded with the randomized LSB engine |
        `,
      },
      {
        id: 'detect',
        title: 'Detect',
        content: `
<p>Purpose: Statistically analyse a file for signs of hidden data.</p> 

<div>How to use: Drop a file → click **Run detection** → read the verdict.</div>

<h5>Verdict levels:</h5>

| Label | Score | Meaning |
|---|---|---|
| **CLEAN** | 0–39% | No significant anomalies |
| **SUSPICIOUS** | 40–69% | Statistical deviations detected |
| **STEGO** | 70–100% | Strong evidence of embedded payload |

**The 10 detectors:**

| Detector | What it measures |
|---|---|
| Entropy analyzer | Overall byte randomness - high entropy suggests hidden/encrypted data |
| Chi-square attack | Pixel value pair balance - LSB embedding flattens this artificially |
| RS analysis | Local pixel smoothness disruption caused by embedding |
| LSB ratio test | Whether 0s and 1s in the LSB layer are suspiciously balanced |
| Histogram analysis | Smoothness of the colour value histogram |
| Sample pair analysis | Adjacent-sample LSB correlation disruption |
| EOF append detector | Scans for Steganaliz's own EOF-append marker |
| Header consistency | Checks that file magic bytes match the claimed extension |
| Metadata inspector | Flags non-standard or oversized PNG chunks |
| Signature fingerprinter | Scans for known Steganaliz embedding signatures |

Detection is **probabilistic** - results indicate likelihood, not certainty.
        `,
      },
      {
        id: 'batch',
        title: 'Batch',
        content: `
<p>**Purpose:** Run embed or detect across up to 25 files at once.</p>


**Batch detect** - processes each file through the full 10-detector suite. Results show per-file verdicts as they complete.

<div>**Batch embed** - embeds the same message into all files. Successful outputs are bundled into a single **.zip download** automatically.</div>

**Notes:**
- Batch embed uses the same message for every file (per-file customization is not supported)
- Files that fail (unsupported format, over capacity) are skipped and logged - they don't stop the rest of the batch
- Only PNG/BMP use the LSB engine in batch embed; everything else uses EOF-append
        `,
      },
      {
        id: 'metadata',
        title: 'Metadata',
        content: `
**Purpose:** Produce a "clean" copy of an image with all metadata removed.

**What gets removed** (images only):
- EXIF data - camera model, lens, timestamps, **GPS location**
- ICC colour profiles
- XMP metadata
- Non-standard PNG chunks (including Steganaliz's own payload chunks)
- Any EOF-appended data

**How it works:** The image is re-encoded through a clean canvas pixel buffer. Only raw pixel values survive - everything else is discarded.

<div>**Why the output might be larger:** PNG re-encoding is lossless. The freshly compressed output may not match the original file's compression, but it contains no hidden data.<div>

**Other formats:** Format-specific stripping for PDF, MP3, DOCX, etc. is on the roadmap. Non-image files currently pass through unchanged with a notice.
        `,
      },
      {
        id: 'history',
        title: 'History',
        content: `
**Purpose:** Session-local audit trail of all operations performed.

Every embed, extract, detect, batch run, and metadata strip is logged with:
- Operation type
- Filename
- Brief result (technique used, bytes embedded, verdict score)
- Timestamp

**Privacy:** The log is held in memory only. It is **never written to disk or storage** and is permanently cleared when the tab closes. This is intentional - a steganography tool should not leave a persistent record.
        `,
      },
      {
        id: 'ctf',
        title: 'CTF Mode',
        content: `
**Purpose:** Rapid extraction for Capture the Flag challenges where the technique and password are unknown.

<div>**Features:**</div>

**Hex preview** - shows the first 256 bytes of any dropped file as a hex dump, letting you identify the file type from its magic bytes and spot known signatures manually.

<p>**Multi-technique extraction** - automatically tries every engine that supports the file type, in sequence, without a password first. Stops and displays the result as soon as one succeeds.</p>

**Wordlist brute-forcing** - paste one password per line. If unencrypted extraction fails, every password is tried against each engine in order. Useful for CTF challenges with known wordlists.

**When to use CTF Mode vs. Extract:** Use Extract when you know the technique and password. Use CTF Mode when you don't.
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
        id: 'heatmap',
        title: 'Entropy Heatmap',
        content: `
**Purpose:** Visually locate where in an image embedded data is concentrated.

The image is divided into 16×16 pixel blocks. Each block's Shannon entropy is computed and mapped to a colour:

| Colour | Entropy | Meaning |
|---|---|---|
| **Deep blue** | Low | Natural, predictable content - sky, flat surfaces |
| **Green** | Medium | Normal photographic texture |
| **Yellow / Red** | High | Random-looking content - possibly encrypted payload |

**What to look for:**
- A sharp **rectangular warm region** in the top-left area indicates a sequential LSB payload that hasn't filled the whole image
- **Uniformly elevated entropy** across the whole image could indicate a randomized or high-capacity embed
- A completely natural image shows entropy that follows its visual content - no unexpected boundaries

**Supported:** PNG, JPG, BMP, GIF, WEBP only.
        `,
      },
      {
        id: 'bitplane',
        title: 'Bitplane Inspector',
        content: `
**Purpose:** Extract a single bit position from a colour channel and render it as black/white.

Each 8-bit pixel channel has 8 bit positions (0 = LSB, 7 = MSB). Select a channel (R, G, B) and a bit position to render.

**Reading the output:**
- **Bit 7 (MSB):** Looks like a recognizable high-contrast silhouette of the image
- **Bit 0 (LSB) - clean image:** Random-looking visual noise with no structure or boundaries
- **Bit 0 - sequential payload:** A visible **rectangular boundary** separates the embedded region (structured noise) from the untouched area (natural noise)
- **Bit 0 - randomized payload:** No boundary, but the noise texture may appear subtly more uniform

The anomaly score measures how far the bitplane deviates from the statistical properties of natural image noise.
        `,
      },
      {
        id: 'report',
        title: 'Forensic Report',
        content: `
**Purpose:** Generate a formal analysis report from a detection pass.

<div>**What the report contains:**</div>
- File identification (name, size, type, timestamp)
- Overall verdict and confidence score
- Per-detector breakdown with scores and detail strings
- EOF-append marker scan result
- Methodology notes
- Formal forensic disclaimer

**Export options:**
- **PDF** - formatted A4 document with colour-coded verdict, structured table, page numbers
- **.txt** - plain-text version for pasting into investigation notes

**Disclaimer:** All reports state that results are probabilistic and must not be treated as conclusive forensic evidence without independent expert verification.
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
        title: 'Encryption (AES-256-GCM)',
        content: `
Payload encryption uses **AES-256-GCM** - authenticated symmetric encryption providing both confidentiality and integrity.

**Key derivation:** Your password is never used directly as a key. It goes through **PBKDF2-SHA256** with:
- A random 32-byte salt (unique per encryption)
- **310,000 iterations** (OWASP-recommended minimum)
- 256-bit output key

**Per-encryption randomness:** A fresh 12-byte IV is generated for every single encryption - IV reuse is structurally impossible.

<div>**Stored framing:** \`[salt 32B] + [IV 12B] + [ciphertext + auth tag]\`

**No third-party libraries.** All cryptography uses the browser's native **Web Crypto API** exclusively.</div>

If you forget the password, there is **no recovery path.** The encryption has no backdoor.
        `,
      },
      {
        id: 'defenses',
        title: 'Security hardening',
        content: `
| Defense | What it protects against |
|---|---|
| Triple file validation (extension + MIME + magic bytes) | File spoofing and type confusion attacks |
| Zip bomb protection (100× ratio guard) | Resource exhaustion |
| 100 MB file size cap | Memory exhaustion |
| SVG sanitization (strips \`<script>\`, event handlers) | SVG-delivered XSS |
| Extracted payloads rendered as \`<pre>\` only | XSS via malicious payload content |
| Content Security Policy (no inline scripts, no external scripts) | Script injection |
| \`X-Frame-Options: DENY\` | Clickjacking |
| \`X-Content-Type-Options: nosniff\` | MIME sniffing attacks |
| Randomized delay on decryption failure | Timing oracle attacks (CWE-208) |
| Client-side rate limiting per operation | Abuse and resource exhaustion |
| HTTPS + HSTS (2-year preload) | Downgrade and MITM attacks |
| Source maps disabled in production | Code disclosure |
        `,
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    icon: '',
    sections: [
      {
        id: 'formats',
        title: 'Supported formats',
        content: `
| Format | Embed engines available | Detection |
|---|---|---|
| PNG, BMP | LSB sequential, LSB randomized, metadata chunk, EOF-append | Full suite |
| JPG, JPEG | EOF-append | Chi-square, histogram, LSB ratio, sample pair, RS, entropy |
| GIF, SVG | EOF-append | Entropy, header check |
| WAV | WAV audio LSB, EOF-append | Entropy |
| MP3, MP4 | EOF-append | Entropy |
| PDF, DOCX, PPTX, ODT, RTF | EOF-append | Header check, entropy |
| TXT, MD, HTML, XML, CSV | EOF-append | - |
| PY, JS, TS, CSS, JSON | EOF-append | - |
| EXE, BIN, ISO, APK, ZIP | EOF-append | - |

**Format limits:**
- WAV: 16-bit PCM only (8-bit, 24-bit, float WAV not supported)
- Maximum file size: **100 MB**
- JPEG cannot use pixel LSB - lossy compression destroys arbitrary bit-level changes
        `,
      },
      {
        id: 'capacity',
        title: 'Capacity reference',
        content: `
**PNG/BMP LSB:**
\`capacity = floor((pixels × 3 − 40) / 8) bytes\`

| Image size | Capacity |
|---|---|
| 100×100 | ~3.7 KB |
| 512×512 | ~96 KB |
| 1920×1080 | ~743 KB |

**WAV audio LSB:**
\`capacity = floor((samples − 40) / 8) bytes\`
At 44.1 kHz stereo: ~645 KB per minute of audio.

<p>**EOF-append:** No practical limit (file size cap applies).</p>

**Encryption overhead:** +44 bytes per operation (32-byte salt + 12-byte IV).
        `,
      },
      {
        id: 'payload-format',
        title: 'Payload framing',
        content: `
All engines use a consistent binary framing so extraction works without out-of-band knowledge.

**LSB / WAV / chunk engines:**
\`[flag: 1B] [length: 4B big-endian] [payload: NB]\`

<div>**EOF-append:**
\`[STGZAPND: 8B] [flag: 1B] [length: 4B] [payload: NB]\`</div>

**Flag values:** \`0x00\` = plaintext · \`0x01\` = AES-256-GCM encrypted

<div>**When encrypted, payload = AES-GCM framing:**
\`[salt: 32B] [IV: 12B] [ciphertext + auth tag: N+16B]\`</div>
        `,
      },
      {
        id: 'faq',
        title: 'FAQ',
        content: `
<p>**Can Steganaliz detect files embedded by other tools (Steghide, OpenStego)?**
The statistical detectors (entropy, chi-square, RS, LSB ratio, histogram, sample pair) work on any file regardless of which tool embedded it. The signature fingerprinter and EOF-append detector only recognize Steganaliz's own markers.</p>

<p>**Why is the metadata-stripped file larger than the original?**
PNG re-encoding is lossless but not always size-efficient. The output is structurally clean (no hidden data) even if the byte count is higher.</p>

<p>**I forgot my password. Can I recover the payload?**
No. AES-256-GCM with PBKDF2 at 310,000 iterations has no recovery path. There is no backdoor.</p>

<p>**Is Steganaliz suitable for forensic evidence?**
As a triage tool, yes. As definitive evidence, no - all reports include a mandatory disclaimer that results are probabilistic and require independent expert verification.</p>

<p>**Does it work offline?**
Yes, after initial page load. Install as a PWA for offline access without a browser tab.</p>

<p>**Where is my session history stored?**
In memory only. It is permanently cleared when the tab closes.</p>

<p>**How do I know nothing is uploaded?**
Open DevTools → Network tab → perform any operation. You will see zero outgoing requests.</p>
        `,
      },
    ],
  },
];