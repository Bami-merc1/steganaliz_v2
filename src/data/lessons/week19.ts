import type { Lesson } from '../../types/curriculum';

export const WEEK_19_LESSONS: Lesson[] = [
  {
    id: 'w19-aes-architecture',
    title: 'AES architecture: Substitution-Permutation Networks, S-Boxes, and round structure',
    summary: 'How the Advanced Encryption Standard actually scrambles a 16-byte block, step by step.',
    estimatedMinutes: 35,
    content: `
## Where AES sits in this course's arc

AES (Advanced Encryption Standard) is the block cipher your own \`crypto.ts\` uses via \`AES-GCM\`. Everything in Weeks 16-18 was building toward being able to actually understand what happens inside \`crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)\` when it runs - this lesson opens that box.

## The high-level goal: confusion and diffusion

Claude Shannon (the same Shannon from Week 18's OTP proof) identified two properties a strong cipher needs, now foundational cryptographic vocabulary:

**Confusion**: the relationship between the key and the ciphertext should be as complex and non-linear as possible - an attacker studying ciphertext shouldn't be able to infer anything simple about the key.

**Diffusion**: a single changed input bit (plaintext *or* key) should influence *many* output bits, spreading its effect across the entire block - directly the same avalanche-effect principle from Week 17's hashing lesson, now required of an encryption cipher rather than a hash function.

AES achieves both through a **Substitution-Permutation Network (SPN)**: repeated rounds alternating a *substitution* step (confusion) with a *permutation/diffusion* step, each round also mixing in key material derived from the original key.

## AES's block and key sizes

AES always operates on **128-bit (16-byte) blocks**, regardless of key size. The key itself can be 128, 192, or 256 bits (your project uses **AES-256**, the 256-bit variant) - a longer key doesn't change the block size, but does increase the number of rounds the algorithm runs (AES-256 uses 14 rounds, versus AES-128's 10), directly raising the computational cost of any brute-force key search.

## The state: a 4x4 byte grid

AES organizes each 16-byte block into a conceptual 4x4 grid of bytes (the "state"), and each round applies four distinct transformations to this grid, in sequence.

## Step 1: SubBytes (the S-Box) - confusion

Every byte in the state is replaced using a fixed, pre-computed lookup table called the **S-Box (Substitution Box)** - a carefully-designed, non-linear mapping from each of the 256 possible byte values to another byte value. "Non-linear" is the crucial property here: a linear substitution (like Caesar's simple shift) preserves exploitable algebraic relationships between input and output; the S-Box is specifically constructed (via finite-field mathematics - multiplicative inverses in GF(2^8), for the mathematically curious, though the design rationale matters far more here than the number theory) to have **no such simple relationship**, directly delivering the "confusion" property.

\`\`\`
Example S-Box lookups (illustrative, not exhaustive):
0x00 → 0x63
0x01 → 0x7c
0x53 → 0xed
\`\`\`

This is structurally the same *category* of operation as your own \`chiSquareDetector\`'s PoV analysis in reverse: where chi-square looks for statistical regularity that betrays tampering, the S-Box is engineered specifically so that **no such regularity exists to find** between a block's input and output bytes.

## Step 2: ShiftRows - diffusion (row-level)

Each row of the 4x4 state grid is cyclically shifted left by a different amount (row 0: no shift, row 1: shift by 1, row 2: shift by 2, row 3: shift by 3). This alone doesn't scramle *values* - it only moves bytes to different *positions* - but positioning is exactly what the next step needs to spread influence across the whole block.

## Step 3: MixColumns - diffusion (column-level)

Each column of the state is treated as a small vector and multiplied by a fixed matrix (again using finite-field arithmetic), producing a new column where **every output byte depends on every input byte in that column**. Combined with ShiftRows' row-level repositioning from the previous step, a handful of rounds is enough for **every single output byte to depend on every single input byte and every key byte** - the concrete, mechanical realization of the avalanche effect at the cipher-design level.

## Step 4: AddRoundKey - mixing in the secret

The state is XORed (that operation again, from Week 16) against a **round key** - a value derived from the original encryption key via a process called **key expansion/key schedule**, which deterministically generates a distinct round key for every round from the single original key. This is the step that actually makes the transformation depend on the secret key at all; SubBytes/ShiftRows/MixColumns alone would be a fixed, public, keyless (and therefore useless for secrecy) scrambling.

## Putting it together: the full round structure

\`\`\`
AddRoundKey (using the original key, before round 1 begins)
Repeat for 13 rounds (AES-256):
    SubBytes → ShiftRows → MixColumns → AddRoundKey (with that round's derived key)
Final round (round 14, no MixColumns):
    SubBytes → ShiftRows → AddRoundKey
\`\`\`

The final round omits MixColumns specifically because it would add diffusion with no corresponding security benefit at that point while complicating decryption's exact mathematical inverse - a deliberate, analyzed design choice, not an oversight.

## Why you'll never implement this by hand in your project, and that's correct

Your project uses \`crypto.subtle\` (the Web Crypto API) rather than a hand-rolled AES implementation, for an important, non-negotiable reason worth stating plainly: **correct, secure implementations of primitives like AES must be constant-time** (their execution time must not vary based on secret key bits, or an attacker can measure timing differences to leak key information - a real, historically damaging class of side-channel attack) and must correctly handle numerous subtle edge cases. \`crypto.subtle\`'s implementation is provided by the browser vendor, audited, hardware-accelerated (many CPUs have dedicated AES instructions - AES-NI - specifically because AES is so globally ubiquitous), and vastly more trustworthy than any hand-written JavaScript AES implementation could realistically be. This mirrors this course's cryptography section's own core principle, stated back in Week 17 and worth repeating here as it applies with even more force to block ciphers: **use audited, standard implementations for anything security-critical; understand the internals for the sake of judgment, not for the sake of reimplementing them.**

## Check your understanding

- Why does AES apply *multiple* rounds rather than a single pass of SubBytes/ShiftRows/MixColumns/AddRoundKey - what would a 1-round version be vulnerable to that a 14-round version isn't?
- The S-Box is a fixed, publicly-known table - the same for every AES key in the world. Given that, where does AES's actual secrecy come from, if not from the S-Box itself?
`,
  },
  {
    id: 'w19-modes-of-operation',
    title: 'Block cipher modes of operation: ECB, CBC, and GCM',
    summary: 'Why AES alone only encrypts one 16-byte block, and how a mode of operation extends it to real messages - including the ECB penguin and why GCM is your project\'s choice.',
    estimatedMinutes: 30,
    content: `
## The problem a mode of operation solves

AES, as described in the previous lesson, encrypts exactly **one 16-byte block**. Virtually every real message is either shorter or (almost always) much longer than 16 bytes. A **mode of operation** defines how to apply a block cipher repeatedly across a message of arbitrary length - and, critically, **the choice of mode matters enormously for security**, independent of the underlying block cipher's own strength. AES itself can be perfectly secure while a poorly-chosen mode built on top of it leaks massive amounts of information.

## ECB (Electronic Codebook): the mode you must never use

The naive approach: split the plaintext into 16-byte blocks, encrypt each one **independently** with the same key, concatenate the results.

\`\`\`
ciphertext_block_1 = AES_encrypt(key, plaintext_block_1)
ciphertext_block_2 = AES_encrypt(key, plaintext_block_2)
...
\`\`\`

**The fatal flaw**: identical plaintext blocks always produce identical ciphertext blocks, since each block is encrypted independently with no dependence on any other block or any per-message randomness. This means **any repeating structure in the plaintext remains visible as repeating structure in the ciphertext** - a direct, severe violation of the confusion/diffusion goals from the previous lesson, entirely at the mode-of-operation level, regardless of how strong AES's own per-block scrambling is.

## The "ECB penguin": the canonical illustration

The most famous demonstration of this flaw: encrypt a bitmap image of a penguin (a large, uncompressed image with substantial flat, repeating color regions) using AES in ECB mode, then view the *ciphertext* bytes as if they were still a raw bitmap. The result is unmistakably still a penguin silhouette - individual pixel values are scrambled, but repeated blocks of identical color still map to repeated blocks of identical ciphertext, preserving the image's macro-structure in unmistakable outline. This is a vivid, concrete demonstration that "the individual blocks are strongly encrypted" and "the encrypted output reveals nothing about the plaintext" are **not the same claim** - and it's exactly why ECB mode is considered broken for any real-world use, despite using a perfectly sound underlying cipher.

## CBC (Cipher Block Chaining): fixing ECB's independence problem

CBC fixes ECB's core flaw by **chaining** blocks together: before encrypting each plaintext block, it's first XORed with the *previous block's ciphertext* - so identical plaintext blocks no longer produce identical ciphertext, because each block's encryption now depends on everything that came before it.

\`\`\`
ciphertext_block_1 = AES_encrypt(key, plaintext_block_1 XOR IV)
ciphertext_block_2 = AES_encrypt(key, plaintext_block_2 XOR ciphertext_block_1)
ciphertext_block_3 = AES_encrypt(key, plaintext_block_3 XOR ciphertext_block_2)
\`\`\`

## The Initialization Vector (IV): starting the chain safely

The very first block has no "previous ciphertext block" to chain from - so CBC requires an **Initialization Vector (IV)**, a random value XORed with the first plaintext block before encryption, serving the same essential purpose as a stream cipher's nonce (Week 18): ensuring that **encrypting the same plaintext twice, with the same key, produces different ciphertext each time** - directly because a fresh, random IV is generated for every encryption. A reused IV in CBC mode leaks information about the relationship between the two messages' first blocks, structurally similar to (though less catastrophic than) OTP key reuse from Week 18.

CBC's IV does not need to be secret (like a salt, Week 17) - it's typically transmitted alongside the ciphertext in plaintext - but it absolutely must be **unpredictable and never reused** with the same key.

## GCM (Galois/Counter Mode): encryption and authenticity together

GCM is the mode your own project uses. It combines two distinct ideas into one construction:

**1. Counter mode (CTR) encryption**: rather than chaining blocks like CBC, GCM encrypts a **counter value** (starting from a nonce, incrementing for each block) with the block cipher, then XORs the result against the plaintext - structurally turning the block cipher into a stream cipher, exactly per Week 18's stream-cipher discussion, with the counter's role directly analogous to a nonce.

\`\`\`
keystream_block_n = AES_encrypt(key, nonce || counter_n)
ciphertext_block_n = plaintext_block_n XOR keystream_block_n
\`\`\`

**2. Galois-field authentication**: alongside encryption, GCM computes an **authentication tag** - a value derived from the ciphertext and a separate authentication key (itself derived from the main key), using Galois-field multiplication. This tag is transmitted alongside the ciphertext and verified on decryption; **any modification to the ciphertext, even a single flipped bit, causes tag verification to fail**, alerting the recipient that the data has been tampered with.

## Why "authenticated encryption" is the property that matters most for your project

This is worth stating plainly, because it's easy to underweight: CBC (and ECB, and bare CTR) provide **confidentiality only** - if an attacker who cannot decrypt the ciphertext nonetheless *flips specific bits* within it, the recipient will decrypt to *different, attacker-influenced* plaintext with no built-in indication anything was tampered with (a real, exploitable class of attack called a bit-flipping attack). GCM's authentication tag closes this gap entirely - it provides both confidentiality **and** integrity/authenticity in a single mode, which is precisely why your \`crypto.ts\`'s \`decryptPayload()\` function can safely \`throw\` on any tampered or corrupted ciphertext: \`crypto.subtle.decrypt\` with AES-GCM automatically verifies the authentication tag and rejects the operation if it doesn't match, before your code ever sees any (possibly attacker-manipulated) decrypted bytes.

## Tracing your own project's framing through this lesson

Recall \`crypto.ts\`'s stored format: \`[salt: 32B][IV: 12B][ciphertext + auth tag]\`. The salt (Week 17) derives a fresh key per encryption via PBKDF2; the 12-byte IV (GCM conventionally uses a 96-bit/12-byte nonce, slightly different from CBC's convention, chosen specifically because GCM's internal counter construction is optimized around that length) ensures the same password never produces the same ciphertext twice; and the trailing authentication tag (appended automatically by \`crypto.subtle.encrypt\` to the returned ciphertext buffer) is what makes \`decryptPayload()\`'s catch block - with its deliberate randomized delay, directly defending against the timing-oracle attacks flagged in your project's Table 4.1 - a meaningful, necessary defense rather than dead code.

## Check your understanding

- Why does GCM's counter-mode construction mean that, unlike ECB, encrypting the same plaintext block twice with the same key and the same nonce would still be dangerous - what specifically would leak, and how does this connect back to Week 18's nonce-reuse discussion?
- If an attacker intercepted a GCM-encrypted message and flipped a single ciphertext bit before forwarding it, walk through exactly what would happen when the legitimate recipient tried to decrypt it - and contrast this with what would happen if the same bit-flip were applied to a CBC-encrypted (non-authenticated) message instead.
`,
  },
];
