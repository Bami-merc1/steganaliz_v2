# Steganaliz v2.0

A browser-based steganography and steganalysis workbench. Embed, extract,
and detect hidden payloads across images, audio, and arbitrary file types —
entirely client-side. No data leaves your device.

## Features

- **5 embedding engines**: PNG/BMP LSB (sequential), PNG/BMP LSB (randomized,
  password-seeded), PNG metadata-chunk injection, WAV audio LSB, EOF-append
  (any file type)
- **10 steganalysis detectors**: entropy analysis, chi-square attack,
  RS analysis, LSB ratio test, histogram analysis, sample pair analysis,
  EOF-append detector, header consistency check, metadata inspector,
  signature fingerprinter — combined via a weighted verdict engine
- **AES-256-GCM encryption** with PBKDF2-SHA256 (310,000 iterations) via
  the Web Crypto API — no external crypto library
- **Batch processing** up to 25 files, with zip-bundled output for embeds
- **CTF mode**: multi-technique extraction with wordlist brute-forcing and
  hex preview
- **15-week training curriculum** (34 lessons) spanning binary fundamentals,
  file forensics, steganography techniques, and steganalysis — from absolute
  beginner to advanced

## Security model

All processing is local to your browser tab. No files, messages, or passwords
are ever transmitted to any server. The app has no backend.

Security defenses implemented per OWASP/NIST guidelines:
- File-type triple validation (extension + MIME + magic bytes)
- Zip-bomb protection (100× expansion ratio guard)
- 100 MB file size cap
- SVG sanitization (strips `<script>` and event-handler attributes)
- Content Security Policy (no inline scripts, no external fetches)
- Clickjacking prevention (X-Frame-Options: DENY)
- MIME-sniffing prevention (X-Content-Type-Options: nosniff)
- XSS prevention on extracted payloads (rendered as inert plaintext)
- Client-side rate limiting on embed/detect operations
- AES-256-GCM + PBKDF2-SHA256 encryption layer

## Supported carrier formats

Images: PNG, BMP, JPG/JPEG, SVG, GIF
Audio: WAV, MP3
Video: MP4
Documents: PDF, DOCX, PPTX, ODT, RTF, TXT, MD and more
Binary: EXE, BIN, ISO, APK, ZIP

## Supported browsers

Chrome 90+, Firefox 88+, Safari 15+ — any browser with full Web Crypto API
and Canvas API support.

## Development

\`\`\`bash
npm install
npm run dev       # development server
npm run build     # production build
npm run preview   # preview production build locally
\`\`\`

TypeScript 6 + Vite 8 + React + Tailwind CSS v4.

## Project structure

\`\`\`
src/
├── components/       UI panels (Embed, Extract, Detect, Batch, Metadata,
│                     History, CTF, Training)
├── engines/          Embedding/extraction engines
│   ├── image/        PNG LSB (sequential + randomized), PNG chunk injection
│   ├── audio/        WAV LSB
│   └── binary/       EOF-append
├── detectors/        10 steganalysis detectors + weighted verdict engine
├── data/             15-week training curriculum (34 lessons)
├── store/            Zustand session state
└── utils/            Crypto, file validation, rate limiting, SVG sanitisation
\`\`\`

## Limitations and honest scope

- JPEG/DCT-domain embedding and WAV phase-coding are documented in the
  Training curriculum but not yet implemented as working engines — the
  curriculum's Week 7/8 material explains why DCT embedding is meaningfully
  more complex than spatial-domain work.
- Disk-level forensics (slack space, ADS, raw partition carving) are taught
  in the curriculum but intentionally out of scope for a browser-based tool —
  the browser sandbox prevents filesystem-level access by design.
- The RS analysis detector uses single-mask analysis rather than the full
  dual-masking method with payload-length estimation, which is noted in the
  relevant lesson.

## License

MIT
\`\`\`

Now run:

```bash
npm run build
```

and tell me what the output looks like — specifically any TS errors in the build output, and the chunk sizes Rollup reports. That'll tell us whether the manual chunk split is working (curriculum chunk should be noticeably bigger than the others, since 34 lessons is a lot of text) and whether there are any remaining type errors that only surface at build time rather than in the editor. Then we'll sort whatever comes out of that before moving to deployment.
