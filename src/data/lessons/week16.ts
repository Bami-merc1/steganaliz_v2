import type { Lesson } from '../../types/curriculum';

export const WEEK_16_LESSONS: Lesson[] = [
  {
    id: 'w16-bits-bytes-encoding-review',
    title: 'Computer data fundamentals, revisited for cryptography',
    summary: 'Binary, hex, ASCII, and bitwise operations - the same foundation from Phase 1, now read through a cryptographic lens.',
    estimatedMinutes: 25,
    content: `
## Why cryptography starts here, again

Phase 1 of this course (Weeks 1-4) built your foundation in binary, hex, ASCII, and bitwise operators for the purposes of steganography - hiding data inside the structure of files. Cryptography uses the *exact same primitives*, but for a different purpose: not hiding that data exists, but making its content unreadable without a secret. It's worth explicitly re-anchoring this, because the mechanics you already know are about to become load-bearing in a new way.

## The one operator that matters most here: XOR

Recall from Week 1: XOR (\`^\`) outputs 1 when its two input bits differ, 0 when they match.

\`\`\`
  1010
^ 0110
------
  1100
\`\`\`

XOR has a property no other basic bitwise operator has: it is **perfectly, losslessly reversible** with the same key.

\`\`\`
plaintext  XOR key = ciphertext
ciphertext XOR key = plaintext        (XOR again with the same key undoes it)
\`\`\`

This single mathematical fact - XOR-ing twice with the same value returns you to the original - is the seed from which almost every stream cipher and one-time pad in this course grows. It is worth internalizing as more than a curiosity: **every time you see "encrypt" described informally as "combine the data with a secret," XOR is very often the literal operation doing the combining**, either directly (stream ciphers, Week 18) or as one step inside a much larger, more elaborate structure (AES's internals, Week 19).

## A minimal worked example: XOR as encryption

\`\`\`
Plaintext byte:   01001000   (72, 'H')
Key byte:         00101011   (43)
XOR:              01100011   (99, 'c') → ciphertext

Decrypt:
Ciphertext byte:  01100011   (99, 'c')
Key byte:         00101011   (43)
XOR:              01001000   (72, 'H') → recovered plaintext
\`\`\`

Notice this is a **complete, working encryption scheme** already - astonishingly, the entire mechanism of a stream cipher is "generate a stream of key bytes, XOR them against the plaintext." The rest of this course's symmetric-encryption material (Weeks 18-19) is really about answering one hard question this example doesn't yet address: **where does the key stream come from, and how do you make it unpredictable enough that this doesn't collapse into a trivially breakable scheme?**

## Encoding vs. encryption: the distinction this entire phase depends on

This is the single most common conceptual confusion beginners bring into cryptography, and it must be resolved before anything else in this phase will make sense:

**Encoding** (Base64, hex, URL-encoding) is a **reversible format transformation with no secret involved**. Anyone, with zero special knowledge, can decode Base64 back to its original bytes - the "encoding scheme" is public, standardized, and provides **zero confidentiality**. Its purpose is compatibility (e.g., representing arbitrary binary data safely inside text-only transport formats like JSON or URLs), never secrecy.

**Encryption** (AES, RSA - the rest of this phase) is a **reversible transformation that requires a secret** (a key) to reverse. Without the key, recovering the plaintext should be computationally infeasible, even knowing the exact algorithm used.

\`\`\`
Encoding:   "Hello" → Base64 → "SGVsbG8="  → anyone can reverse this, no key needed
Encryption: "Hello" → AES-256-GCM(key) → [ciphertext bytes] → only the key holder can reverse this
\`\`\`

A genuinely dangerous, real-world mistake - worth naming explicitly because it happens constantly in production systems - is treating Base64-encoded data as if it were "encrypted" or "obfuscated" for security purposes. It provides **no security property whatsoever**. If you ever see a password or API key stored as "just Base64," treat that as equivalent to storing it in plaintext.

## Why your own project already demonstrates this distinction cleanly

Your \`crypto.ts\`'s \`encryptPayload()\` function performs genuine encryption (AES-256-GCM via the Web Crypto API, covered in depth in Week 19) - it requires a password-derived key to reverse. Nowhere in your embedding engines does Base64 or similar encoding provide confidentiality; where encoding-like operations appear (e.g., converting bytes to a bit array in \`pngLsb.ts\`), they're purely structural, with the actual confidentiality guarantee coming entirely from \`encryptPayload()\`'s AES-GCM step beforehand.

## Check your understanding

- If someone encoded a password in Base64 and stored it in a public database column, and you had no other information, how long would it take you to recover the original password? What does your answer reveal about why "encoding is not encryption" is not just pedantry?
- Why does XOR's reversibility specifically depend on using the *same* key both times - what would happen if you accidentally XORed with a different key during "decryption"?
`,
  },
  {
    id: 'w16-encoding-systems',
    title: 'Encoding systems: Base64, URL/percent-encoding, and character sets',
    summary: 'The specific, named encoding schemes you\'ll see constantly in real systems, and exactly how each one works byte-by-byte.',
    estimatedMinutes: 30,
    content: `
## Why encoding schemes exist at all

Many transport formats and protocols were designed around **text**, not arbitrary binary data - email (historically 7-bit ASCII-safe), URLs (a restricted character set), JSON (a text format with specific escaping rules). Encoding schemes exist to answer one question: *how do I safely represent arbitrary bytes using only a "safe" subset of characters, in a way that's perfectly reversible?*

## Base64: 3 bytes become 4 characters

Base64 takes **3 bytes (24 bits) at a time** and re-slices them into **4 groups of 6 bits each**, then maps each 6-bit value (0-63) to one of 64 printable ASCII characters (\`A-Z\`, \`a-z\`, \`0-9\`, \`+\`, \`/\`, with \`=\` used for end-of-input padding).

\`\`\`
Input bytes:  01001000  01100101  01101100     ("Hel")
Regroup into
6-bit chunks: 010010  000110  010101  101100
Decimal:      18       6       21      44
Base64 chars: S        G       V       s
Result:       "SGVs"
\`\`\`

**Why 6 bits specifically?** Because 2^6 = 64, and 64 printable characters is comfortably within the safe, universally-portable ASCII printable range, while 2^7 or 2^8 would require characters that aren't reliably safe across every legacy text-oriented system Base64 was designed to work with.

**Why the size grows by ~33%:** 3 bytes (24 bits) become 4 characters (using only 6 of each character's 8 available bits) - so Base64-encoded data is always about 4/3 the size of the original binary. This is a direct, unavoidable structural cost of the encoding, not an inefficiency to be optimized away - and it's exactly why your project's own encrypted payload framing (Week 19 revisits this) is stored as **raw bytes**, not Base64, wherever the underlying storage format permits raw binary directly.

**Padding:** if the input isn't a multiple of 3 bytes, \`=\` characters pad the final group so the output length stays a clean multiple of 4 - a receiver uses this padding to know exactly how many of the final 4-character group's bits are "real" data versus filler.

## URL encoding / percent-encoding

URLs have their own restricted "safe" character set (letters, digits, a handful of punctuation marks). Any byte outside that safe set is represented as \`%\` followed by its two-digit hexadecimal value.

\`\`\`
Space character (0x20)  → %20
'&' character (0x26)     → %26   (reserved - has special meaning in query strings)
'é' (UTF-8: 0xC3 0xA9)   → %C3%A9   (each byte of the UTF-8 sequence encoded separately)
\`\`\`

Notice the direct structural parallel to hex-dump notation from Week 2: percent-encoding is, quite literally, "write this byte's value in hex, with a \`%\` marker in front" - the same hex representation you've been reading since Week 1, applied as a transport-safety mechanism rather than a debugging aid.

## Why character-set encoding (UTF-8/UTF-16) belongs in this discussion too

Recall Week 1's UTF-8 lesson: choosing *how* to represent a code point as bytes is itself a kind of encoding decision, made **before** any Base64 or percent-encoding happens. This matters concretely for cryptography: **you must encrypt bytes, not "text"** - a string containing non-ASCII characters (accented letters, emoji, non-Latin scripts) has no single canonical byte representation until you pick an encoding (UTF-8 vs. UTF-16 vs. others), and picking inconsistently between encryption and decryption is a real, common bug class. This is exactly why your own \`crypto.ts\` calls \`new TextEncoder().encode(password)\` before ever touching \`PBKDF2\` - \`TextEncoder\` fixes the encoding to UTF-8 explicitly, so both encryption and later decryption operate on an unambiguous byte sequence rather than an implicit, potentially-inconsistent one.

## Chaining encodings: a realistic example

A common real pattern, worth tracing end to end: encrypt a message with AES-GCM (raw binary ciphertext output) → Base64-encode the ciphertext (so it can be safely placed inside a JSON field or a URL query parameter) → percent-encode the Base64 string if it's going directly into a URL (since Base64's \`+\` and \`/\` characters aren't URL-safe by default). Three genuinely different transformations, stacked for three genuinely different reasons - only the first one (encryption) provides any confidentiality; the other two exist purely for transport compatibility.

## Check your understanding

- Why does Base64's \`+\` and \`/\` character choice specifically create friction when Base64 output is embedded directly in a URL, and what does "URL-safe Base64" (a real, common variant using \`-\` and \`_\` instead) tell you about how encoding schemes get adapted for specific transport contexts?
- If you Base64-encoded an already-encrypted ciphertext, and an attacker captured only the Base64 string with no other context, what could they learn about the original plaintext without knowing the key? (Consider: is Base64 itself adding or removing any information about the plaintext's structure?)
`,
  },
];
