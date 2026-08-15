import type { Lesson } from '../../types/curriculum';

export const WEEK_8_LESSONS: Lesson[] = [
  {
    id: 'w8-has-audio-hiding',
    title: 'Human Auditory System (HAS) boundaries and audio hiding techniques',
    summary: 'Why audio steganography exploits different perceptual limits than image steganography, via WAV LSB, phase coding, and echo hiding.',
    estimatedMinutes: 30,
    content: `
## Audio as bytes: PCM, briefly

Uncompressed audio (WAV, the format this course focuses on, mirroring your project's roadmap) stores sound as **Pulse Code Modulation (PCM)**: the sound wave's amplitude is sampled at a fixed rate (e.g., 44,100 times per second — "44.1 kHz") and each sample is stored as an integer of a fixed bit depth (commonly 16-bit, signed, meaning values range from -32,768 to 32,767 — recall Week 1's arithmetic-shift lesson: this is exactly the signed-data case that lesson flagged as needing careful shift handling).

## Human Auditory System limits — different from HVS

Just as HVS has a Just Noticeable Difference for color (Week 5), HAS has its own perceptual thresholds, but they work differently: humans are highly sensitive to *absolute* volume/pitch changes in **quiet** passages, but a small amplitude perturbation is far more easily masked in **loud** passages — a phenomenon called **auditory masking**. This means, unlike image LSB (which applies the same ±1 shift everywhere with roughly consistent imperceptibility), naive audio LSB is *not* equally safe across an entire track — quiet passages are the perceptually risky region.

## WAV LSB: the direct audio analog

Structurally identical to image LSB: take the sample values (16-bit integers instead of 8-bit channel values) and replace their least significant bit(s) with payload bits.

\`\`\`
capacity_bits = sample_count × bits_used_per_sample
\`\`\`

With 16-bit samples, you have more "room" per sample than an 8-bit image channel — you could use 1 LSB (very safe, low capacity) up to several LSBs (higher capacity, increasing risk of audible artifacts, particularly in quiet passages per the masking point above). This is a direct capacity/detectability tradeoff, exactly like Week 6's PVD discussion — the audio-domain equivalent would selectively use more bits-per-sample in louder passages and fewer in quiet ones.

## Phase coding: a fundamentally different mechanism

Rather than modifying amplitude values directly, phase coding manipulates the **phase relationships** between different frequency components of the audio signal. Human hearing is comparatively insensitive to *absolute* phase (as opposed to *relative* phase between frequencies, which does matter perceptually) — phase coding exploits this by encoding payload bits as specific phase-shift patterns applied to segments of the audio, using the signal's own Fourier decomposition (a close conceptual relative of Week 7's DCT — both convert a time/spatial signal into a frequency-domain representation before manipulation).

Phase coding is generally more robust against compression and processing than direct amplitude LSB, at the cost of being significantly more complex to implement correctly and typically offering lower capacity.

## Echo hiding: encoding data as an imperceptible echo

Echo hiding embeds bits by introducing a very short, low-amplitude echo of the original signal, where the **echo's delay time** (not its presence/absence — an echo is always added) encodes the bit: e.g., a 1ms delay might represent a '0' bit, a 2ms delay a '1' bit. Because human hearing struggles to consciously perceive very short echo delays as distinct from the original signal (they perceptually merge, especially against normal audio's own natural room-acoustic reflections), this can be effectively inaudible while surviving certain kinds of audio processing (like re-sampling or mild compression) better than direct LSB does, since the technique relies on a signal-level relationship rather than exact sample values.

## Why your project currently targets WAV specifically

WAV's uncompressed PCM structure makes it the direct audio analog of PNG/BMP from Weeks 5–6 — the same "lossless container, LSB survives unchanged" property applies. MP3 (lossy, like JPEG) would need frequency-domain techniques analogous to Week 7's DCT approach, for exactly the same reason JPEG does — this is a recurring structural pattern worth internalizing: **lossless formats → spatial/amplitude-domain techniques work directly; lossy formats → transform-domain techniques are required**, regardless of whether you're working with images or audio.

## Check your understanding

- Given the auditory masking point above, why might a WAV LSB implementation that adapts its bits-per-sample rate based on local loudness (quiet vs. loud passages) be a meaningful improvement, directly mirroring PVD's logic from Week 6 — just applied to amplitude instead of pixel-pair differences?
- Why is echo hiding's delay-time-based encoding inherently lower capacity (fewer bits per unit of audio) than direct amplitude LSB, even though it's more robust?
`,
  },
  {
    id: 'w8-network-steganography',
    title: 'Network Protocol Steganography: exploiting TCP/IP header fields',
    summary: 'Hiding data in the fields of packets themselves, not in a file at all — a genuinely different steganographic domain.',
    estimatedMinutes: 20,
    content: `
## A different kind of "carrier" entirely

Everything so far has hidden data *inside a file*. Network steganography hides data inside the **metadata of network traffic itself** — specific fields within IP and TCP packet headers that have some flexibility in their values without breaking the protocol, similar in spirit to Week 2's "ancillary/ignorable chunk" concept, just applied to a live protocol instead of a static file format.

## Exploitable fields, and why each works

**IP Identification field** (16 bits): intended to help reassemble fragmented packets, but for unfragmented traffic (the common case), its exact value is largely unconstrained by the receiving system — many implementations simply increment it predictably or don't validate it strictly, leaving room to encode payload bits directly into it.

**TTL (Time To Live)**: normally decrements by 1 at each network hop, used to prevent packets from looping forever. Its *starting* value (set by the sender) has some legitimate variation across operating systems already (common defaults: 64, 128, 255) — subtly non-standard TTL choices can encode a small amount of information per packet, though this is a very low-capacity, coarse-grained channel.

**TCP Sequence Numbers**: intended to track byte-stream ordering and are expected to appear essentially random/unpredictable for security reasons (sequence number prediction is itself a classical network attack). This apparent randomness is exactly what makes them an attractive hiding spot — a receiver expecting steganographic content can derive payload bits from specifically-chosen sequence number values that still satisfy the protocol's ordering requirements, while an observer sees only "normal-looking" pseudo-random sequence numbers.

## Why this domain is structurally different from file steganography

Every technique in Weeks 5–8 (before this lesson) hides data in something **static and persistent** — a file that exists, can be re-examined, hashed, and compared at leisure. Network steganography hides data in something **transient and contextual** — packets that exist only briefly in transit, where "detection" requires either capturing traffic live or having comprehensive packet logs, and where "the carrier" isn't a discrete object but an ongoing protocol exchange between two endpoints across potentially many packets.

## Why this is out of scope for a browser-based tool

Worth being explicit here, the same way Week 3 was explicit about disk-level forensics being out of a browser's reach: browsers have **no access to raw packet construction or low-level TCP/IP header fields** — this is a deliberate, fundamental security boundary (the same class of restriction that keeps a webpage from reading arbitrary disk sectors), enforced far below the JavaScript layer. Network steganography is genuine, important knowledge for this field broadly, and it's worth understanding conceptually — but building or detecting it requires OS-level packet tools (Scapy, raw sockets, Wireshark) that exist outside what any web application, including Steganaliz, can ever directly touch.

## Check your understanding

- Why does the TCP sequence number's *legitimate* expected randomness (for security reasons) make it a better hiding channel than a field expected to be *predictable*, like a normal TTL decrement pattern?
- If you were investigating a suspected network-steganography channel, what would you need access to that a typical end-user application (like a browser) fundamentally cannot obtain?
`,
  },
];