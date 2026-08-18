import type { Lesson } from '../../types/curriculum';

export const WEEK_1_LESSONS: Lesson[] = [
  {
    id: 'w1-binary-hex-ascii',
    title: 'Binary, Hexadecimal, and ASCII/Unicode encoding boundaries',
    summary: 'How a byte becomes a number, and how a number becomes a character.',
    estimatedMinutes: 25,
    content: `
## Why this matters first

Every file your app touches - a PNG, a WAV, a PDF - is, underneath everything, just a sequence of bytes. Before you can hide data inside a file, or detect that something's hidden, you need fluency in how those bytes are represented and read. This lesson is that foundation.

## The byte: your atomic unit

A **bit** is a single 0 or 1. A **byte** is 8 bits grouped together, giving you 2⁸ = **256 possible values**, from 0 to 255.

\`\`\`
Binary:   0 1 0 0 0 0 0 1
Position: 7 6 5 4 3 2 1 0   (bit position, right to left)
\`\`\`

Each bit position represents a power of 2. To convert binary to decimal, sum the powers of 2 where the bit is 1:

\`\`\`
0 1 0 0 0 0 0 1
= 0·2⁷ + 1·2⁶ + 0·2⁵ + 0·2⁴ + 0·2³ + 0·2² + 0·2¹ + 1·2⁰
= 64 + 1
= 65
\`\`\`

## Hexadecimal: binary's shorthand

Binary is unwieldy to read and write by hand - 8 characters per byte adds up fast. Hexadecimal (base 16) fixes this because **exactly 2 hex digits represent exactly 1 byte**, since 16² = 256.

Hex digits: \`0 1 2 3 4 5 6 7 8 9 A B C D E F\` (A–F represent 10–15).

\`\`\`
Binary:      0100 0001
Split in 2:  0100 | 0001
Hex:         4    | 1
Result:      0x41
\`\`\`

This is exactly why hex dump tools (\`xxd\`, \`hexdump\` - which you'll use in Week 2) show two-character groups. Each pair is one byte, full stop.

## ASCII: giving bytes meaning as text

ASCII assigns each byte value (0–127) a specific character. The value 65 (\`0x41\`, \`01000001\`) means the letter **'A'**. This is a *convention*, not a physical law - the byte doesn't "know" it's a letter. A program simply chooses to interpret it that way when displaying it as text, versus interpreting the same byte as a pixel color value, or an instruction, or a length field.

This is the single most important idea in this whole curriculum: **a byte's meaning is entirely determined by how a program chooses to read it.** Steganography exploits this - a byte that "means" a pixel's blue channel can also, quietly, carry one bit of a hidden message, because nothing about the byte itself objects.

## Unicode and UTF-8: beyond 256 characters

ASCII only covers 128 characters - enough for English, not for emoji, Chinese characters, or accented letters. **Unicode** assigns every character a *code point* (a number), and **UTF-8** is the most common way to encode those code points as actual bytes.

UTF-8's clever trick: it's **backward-compatible with ASCII**. Any byte from 0–127 means exactly what it always meant. Characters outside that range use multi-byte sequences, signaled by specific bit patterns in the leading byte:

\`\`\`
0xxxxxxx                              → 1-byte character (ASCII range)
110xxxxx 10xxxxxx                     → 2-byte character
1110xxxx 10xxxxxx 10xxxxxx            → 3-byte character
11110xxx 10xxxxxx 10xxxxxx 10xxxxxx   → 4-byte character
\`\`\`

This matters directly for your project: when \`TextEncoder().encode(message)\` runs in your embed engines, it's doing exactly this UTF-8 conversion - which is *why* your capacity math is in **bytes**, not "characters." A message with emoji or non-English text can take up more bytes than its character count suggests, and your capacity checks need to account for the encoded byte length, not \`message.length\`.

## Worked example

Take the string \`"Hi!"\`:

| Char | Decimal | Binary | Hex |
|------|---------|--------|-----|
| H | 72 | 01001000 | 0x48 |
| i | 105 | 01101001 | 0x69 |
| ! | 33 | 00100001 | 0x21 |

As raw bytes for embedding: \`48 69 21\` (3 bytes → 24 bits, if you were doing 1-bit-per-channel LSB, that's 24 color channels consumed).

## Check your understanding

- Convert the byte \`01011010\` to decimal and hex by hand before checking: decimal 90, hex \`0x5A\`.
- Why does UTF-8's design mean an ASCII text file is *already* valid UTF-8, byte-for-byte?
`,
  },
  {
    id: 'w1-bitwise-operators',
    title: 'Bitwise operators as logic gates',
    summary: 'AND, OR, XOR, NOT - the four operations every LSB embedding engine is built from.',
    estimatedMinutes: 30,
    content: `
## Why this is the core of steganography's engine room

Nearly every embedding and extraction operation in this project - including the \`pngLsbEmbed\`/\`pngLsbExtract\` engines you've already built - comes down to a handful of bitwise operations applied per-bit or per-byte. This lesson makes sure you can trace exactly what they do.

## The four core operators

Each operates independently on every bit position of its operands.

### AND (\`&\`)
Result bit is 1 only if **both** input bits are 1.

\`\`\`
  1010
& 1100
------
  1000
\`\`\`

**Use in your codebase:** \`data[i + c] & 0xfe\` in \`pngLsb.ts\`. \`0xfe\` is \`11111110\` in binary - ANDing with it **clears the last bit to 0** while leaving every other bit untouched, because AND with 1 keeps the original bit, and AND with 0 forces it to 0.

### OR (\`|\`)
Result bit is 1 if **either** input bit is 1.

\`\`\`
  1010
| 0100
------
  1110
\`\`\`

**Use in your codebase:** \`(data[i + c] & 0xfe) | bits[bitIndex]\` - after clearing the last bit with AND, OR sets it to whatever the payload bit is (0 or 1), without touching the other 7 bits. This two-step AND-then-OR pattern is the entire mechanism of LSB substitution.

### XOR (\`^\`)
Result bit is 1 if the input bits **differ**.

\`\`\`
  1010
^ 0110
------
  1100
\`\`\`

XOR's superpower: it's reversible. \`(A XOR B) XOR B = A\`. This is why XOR underlies simple stream ciphers and checksums - you'll see it again when we cover CSPRNG-distributed embedding in Week 6.

### NOT (\`~\`)
Flips every bit.

\`\`\`
~ 1010
------
  0101
\`\`\`

## Reading your own engine through this lens

Here's the exact line from \`pngLsbEmbed\`, annotated:

\`\`\`ts
data[i + c] = (data[i + c] & 0xfe) | bits[bitIndex];
//             ^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^
//             clear the LSB          set it to the payload bit
\`\`\`

If \`data[i + c]\` is \`11010111\` (215) and the payload bit is \`1\`:

\`\`\`
  11010111
& 11111110   (0xfe)
----------
  11010110

  11010110
| 00000001   (the payload bit)
----------
  11010111   → unchanged, because the original LSB was already 1
\`\`\`

If the payload bit were \`0\` instead:

\`\`\`
  11010110
| 00000000
----------
  11010110   → 214, one less than the original 215
\`\`\`

**This is the entire visual cost of LSB steganography**: at most, each channel's value shifts by 1 out of 256 possible values - a change generally invisible to the human eye, but, as you'll learn in Phase 3, statistically detectable.

## Extraction is the mirror operation

\`\`\`ts
data[i + c] & 1
\`\`\`

ANDing with \`1\` (\`00000001\`) isolates just the last bit - every other bit is forced to 0, and the last bit passes through unchanged. This is how \`pngLsbExtract\` reads back what was written.

## Check your understanding

- Why does \`& 0xfe\` specifically target the *last* bit, and not, say, the first? (Hint: look at which bit position \`0xfe\` has as 0.)
- What would \`data[i+c] & 0x0f\` isolate instead, and why might that be useful for a technique that hides data in more than 1 bit per channel?
`,
  },
  {
    id: 'w1-bit-shifts',
    title: 'Logical vs. arithmetic bit shifts',
    summary: 'What << and >> actually do, and why the distinction matters for signed data.',
    estimatedMinutes: 20,
    content: `
## Shifting bits left and right

A **left shift** (\`<<\`) moves every bit left by *n* positions, filling in 0s on the right. It's equivalent to multiplying by 2ⁿ.

\`\`\`
00000101  (5)
5 << 1 → 00001010  (10)
5 << 2 → 00010100  (20)
\`\`\`

A **right shift** (\`>>\`) moves bits right. Here's where it gets interesting: there are two kinds.

### Logical right shift
Fills the vacated bits on the left with **0**, regardless of the original value's sign. This is what you want for unsigned data - like raw pixel channel values, which are always 0–255 and never negative.

\`\`\`
11010000 >>> 2 (logical)
= 00110100
\`\`\`

### Arithmetic right shift
Fills the vacated bits with a copy of the **original sign bit** (the leftmost bit), preserving the number's sign for two's-complement signed integers.

\`\`\`
11010000 >> 2 (arithmetic, sign bit was 1)
= 11110100
\`\`\`

## Where you've already used this

In \`bytesToBits()\`:

\`\`\`ts
bits.push((byte >> i) & 1);
\`\`\`

Since \`byte\` here is always a \`Uint8Array\` element (0–255, unsigned), the shift direction ambiguity doesn't bite you - but it's exactly the kind of assumption that causes real bugs when the same code gets reused on signed data (e.g., audio PCM samples in Week 8, which *are* signed 16-bit integers). Get this distinction wrong there, and a negative sample value shifts incorrectly, corrupting your extracted payload.

## Extracting a byte from a bit array - the reverse operation

\`\`\`ts
byte = (byte << 1) | bits[i * 8 + b];
\`\`\`

Each iteration shifts the byte-so-far left by one (making room), then ORs in the next bit at position 0. Walk through building the byte \`01000001\` (65, 'A') from its bits \`[0,1,0,0,0,0,0,1]\`:

\`\`\`
start:        byte = 0        = 00000000
after bit 0:  byte = 0<<1|0   = 00000000
after bit 1:  byte = 0<<1|1   = 00000001
after bit 0:  byte = 1<<1|0   = 00000010
after bit 0:  byte = 2<<1|0   = 00000100
after bit 0:  byte = 4<<1|0   = 00001000
after bit 0:  byte = 8<<1|0   = 00010000
after bit 0:  byte = 16<<1|0  = 00100000
after bit 1:  byte = 32<<1|1  = 01000001  ✓ 65
\`\`\`

This is exactly what \`bitsToBytes()\` in \`pngLsb.ts\` does for every 8-bit group.

## Check your understanding

- Why must bits be read and written in the *same* order (MSB-first, as this codebase does) on both the embed and extract sides? What breaks if they don't match?
`,
  },
  {
    id: 'w1-endianness',
    title: 'Endianness: Big-Endian vs. Little-Endian',
    summary: 'Why the same 4 bytes can represent two different numbers depending on interpretation.',
    estimatedMinutes: 20,
    content: `
## The problem endianness solves

A number like the 32-bit integer 65,536 needs 4 bytes to store. But which byte comes first in memory - the most significant, or the least significant? Different systems chose differently, and that choice is called **endianness**.

**Big-endian**: most significant byte first (the way you'd naturally write the number).
**Little-endian**: least significant byte first. This is what x86/x64 and ARM (in its common configuration) use natively.

\`\`\`
The number 65,536 (0x00010000) stored as 4 bytes:

Big-endian:    00 01 00 00
Little-endian: 00 00 01 00
\`\`\`

## Where this shows up in your own code

Your \`pngLsb.ts\` length header:

\`\`\`ts
new DataView(lengthBytes.buffer).setUint32(0, payloadBytes.length, false);
//                                                                    ^^^^^
//                                                     false = big-endian
\`\`\`

\`DataView\`'s third argument to \`setUint32\`/\`getUint32\` controls endianness explicitly - \`false\` (or omitted) means big-endian, \`true\` means little-endian. This project deliberately chose **big-endian, network byte order** for the length header, which is the conventional choice for file/protocol formats (it's literally called "network byte order" because internet protocols standardized on it).

**Why this matters practically:** if \`embed\` writes the length as big-endian but \`extract\` ever read it as little-endian, a message of length 4 (\`0x00000004\`) would misread as 67,108,864 - and your extraction would immediately fail the capacity sanity check. Endianness bugs are a classic, maddening source of "it worked in testing but not in production" failures specifically because small test values (under 256) look identical in both orderings - the bug only appears once a length or size crosses a byte boundary.

## Real file formats disagree with each other

This isn't academic - it's why file parsers need to know their format's convention:

- **PNG** chunk lengths: big-endian
- **BMP** header fields: little-endian
- **WAV** RIFF header: little-endian (with the notable exception of some chunk IDs, which are stored as raw ASCII, not numbers)
- **JPEG** markers: big-endian

You'll hit this directly and painfully in Week 8, when parsing WAV headers for audio steganography - get the endianness wrong reading the \`sampleRate\` or \`bitsPerSample\` field, and you'll compute a garbage capacity or corrupt the file entirely.

## Check your understanding

- If you saw the 2 bytes \`01 00\` in a file and were told they represent a little-endian 16-bit integer, what decimal value is that? (Answer: 1 - least significant byte first, so it's \`0x0001\`.) What would it be if big-endian instead? (256, \`0x0100\`.)
`,
  },
];