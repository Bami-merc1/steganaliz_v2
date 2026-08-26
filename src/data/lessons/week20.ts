import type { Lesson } from '../../types/curriculum';

export const WEEK_20_LESSONS: Lesson[] = [
  {
    id: 'w20-public-key-crypto',
    title: 'Public-key cryptography: RSA, prime factorization, and elliptic curves',
    summary: 'How two keys - one public, one private - solve a problem symmetric encryption alone cannot.',
    estimatedMinutes: 35,
    content: `
## The problem every prior lesson in this phase has quietly assumed away

Every symmetric cipher covered so far - the OTP, stream ciphers, AES - requires both parties to **already share a secret key** before any secure communication can happen. This is called the **key distribution problem**, and it's a serious, practical obstacle: how do two people who have never met, with no prior secure channel, agree on a shared secret over a network an adversary can freely observe? Everything in this phase up to now has no answer to this question. **Public-key (asymmetric) cryptography** is the answer.

## The core idea: two mathematically linked keys

Asymmetric cryptography uses a **key pair**: a **public key**, freely shared with anyone, and a **private key**, kept secret and never shared. The two keys are mathematically related in a specific, carefully-designed way: **data encrypted with the public key can only be decrypted with the corresponding private key** - and, crucially, knowing the public key does not give a computationally feasible way to derive the private key.

\`\`\`
Anyone with Alice's public key → can encrypt a message → only Alice's private key can decrypt it
\`\`\`

A useful, if imperfect, analogy: the public key is like an open padlock anyone can snap shut on a box, but only the matching private key can open it again. Unlike Weeks 18-19's symmetric ciphers, there is no single shared secret here at all - only a mathematical relationship between two different values, one of which is safe to publish.

## Why this isn't "just a different cipher" - it's solving a structurally different problem

It's worth being precise about the tradeoff: asymmetric algorithms (RSA, elliptic-curve cryptography) are **computationally far more expensive** than AES - often hundreds to thousands of times slower for equivalent data volume. This is *not* a flaw to be optimized away; it's an inherent consequence of the underlying math being deliberately, provably harder to reverse without the private key. This expense is precisely why, as the next lesson covers, real systems use asymmetric crypto sparingly (to solve the key-distribution problem specifically) and switch to fast symmetric crypto for the bulk of actual data encryption.

## RSA: security from the difficulty of factoring large primes

RSA (Rivest-Shamir-Adleman, 1977) builds its key pair from two large, randomly-chosen **prime numbers**. Multiplying them together to get their product is computationally trivial - but given only the product, **finding the two original prime factors is believed to be computationally infeasible** for sufficiently large primes (RSA keys in current use are typically 2048 or 4096 bits, meaning primes with hundreds of decimal digits each).

\`\`\`
Easy direction:  p × q = n            (multiply two large primes - fast)
Hard direction:  n → find p and q     (factor a large number - believed intractable at scale)
\`\`\`

RSA's public and private keys are constructed from \`n\` (the product) and additional values derived using modular arithmetic (specifically, Euler's totient function and modular multiplicative inverses - the precise number theory is a full course in itself, and deliberately out of scope here; what matters for this course's purposes is the **security argument**, not the derivation) such that the encryption and decryption operations are mathematical inverses of each other **only** if you know the prime factorization - which only the private-key holder does.

## Elliptic Curve Cryptography (ECC): the same goal, different hard problem

ECC achieves the same public/private key relationship using a **different** underlying hard problem: the **elliptic curve discrete logarithm problem**. Points on a specially-defined elliptic curve (over a finite field) can be "added" together using a defined geometric/algebraic operation; given a starting point and a "multiplier" (the private key), computing the resulting point (the public key) is fast, but given only the starting point and the resulting point, recovering the multiplier is believed computationally infeasible.

**Why ECC matters practically**: it achieves equivalent security to RSA using **dramatically shorter keys** - a 256-bit ECC key is considered roughly comparable in strength to a 3072-bit RSA key. Shorter keys mean faster computation, smaller signatures and ciphertexts, and less bandwidth/storage overhead - which is why ECC has become the dominant choice in newer protocols and systems (modern TLS, Signal's protocol, most cryptocurrency systems) even though RSA remains extremely widely deployed in older and legacy infrastructure.

## Why "believed intractable" is doing real, load-bearing work in this lesson

Worth being explicit and honest about this, since it's a genuinely different security posture from anything in Weeks 16-19: **RSA and ECC's security is not proven the way Shannon's OTP proof (Week 18) is proven.** Both rest on the *empirical, decades-long observation* that no one has found an efficient algorithm to solve the underlying hard problem (integer factorization for RSA, discrete logarithm for ECC) on a classical computer - not a mathematical guarantee that no such algorithm exists. This is precisely why key sizes have grown over time (early RSA deployments used far smaller keys than today's 2048/4096-bit standard) as computing power and factoring algorithms have both improved, and it's the exact reason **quantum computing** poses a genuine, actively-researched long-term threat to both RSA and ECC specifically: Shor's algorithm, if run on a sufficiently large, fault-tolerant quantum computer (which does not yet exist at the scale required), would efficiently solve both the factoring and discrete-logarithm problems - motivating the ongoing, active field of **post-quantum cryptography**, which is exploring entirely different hard-problem families (lattice-based, code-based, and others) specifically designed to resist quantum attack. This is genuinely current, active research as of this course's writing, not a settled question - worth knowing exists, even though it sits outside this course's practical scope.

## Check your understanding

- Given that RSA and AES solve genuinely different problems (key distribution vs. bulk data confidentiality), would it make sense to use RSA to encrypt an entire large file directly, given what you now know about its computational cost? What would you expect a well-designed system to do instead? (The next lesson answers this directly.)
- Why does the security of both RSA and ECC rest on an *asymmetry of computational difficulty* (easy one direction, hard the other) rather than on keeping the underlying mathematical operation itself secret - and how does this compare to Kerckhoffs's principle, the foundational cryptographic assumption that a system should remain secure even if everything about it except the key is public knowledge?
`,
  },
  {
    id: 'w20-key-exchange-hybrid',
    title: 'Diffie-Hellman key exchange and hybrid encryption',
    summary: 'How two strangers agree on a shared secret over a public channel, and why every practical system combines asymmetric and symmetric crypto.',
    estimatedMinutes: 30,
    content: `
## The specific problem Diffie-Hellman solves

Recall the opening of the previous lesson: two parties with no prior shared secret, communicating only over a channel an adversary can freely observe (though, critically, not necessarily *tamper with* undetected - that distinction matters and is revisited below). **Diffie-Hellman (DH) key exchange** (1976, predating RSA) lets them arrive at a **shared secret value** that an eavesdropper, watching every message exchanged, cannot feasibly compute - without ever transmitting the secret itself over the channel.

## The mechanism, via the classic "paint mixing" analogy

Before the exact math, the intuition: imagine Alice and Bob publicly agree on a common paint color (public, known to everyone, including an eavesdropper). Each privately mixes in their own secret color (kept to themselves) and sends the *resulting mixture* (not their secret color) to the other. Each then mixes the received mixture with their own secret color again. Both arrive at the **same final color** - but critically, an eavesdropper who saw the public starting color and both transmitted mixtures cannot feasibly "unmix" either transmission to recover either party's secret color, because paint mixing (like the modular exponentiation DH actually uses) is easy to do but computationally hard to reverse.

## The actual mathematics: modular exponentiation

DH uses two public values agreed on in advance: a large prime \`p\` and a base \`g\`. Each party generates a **private** random secret (\`a\` for Alice, \`b\` for Bob), computes a **public** value from it, and exchanges only the public values:

\`\`\`
Alice's private secret: a          Bob's private secret: b
Alice computes and sends:  A = g^a mod p
Bob computes and sends:    B = g^b mod p

Alice then computes:  B^a mod p  =  g^(ba) mod p
Bob then computes:    A^b mod p  =  g^(ab) mod p

Both arrive at the SAME value:  g^(ab) mod p   ← the shared secret
\`\`\`

The security rests on the **discrete logarithm problem**: given \`g\`, \`p\`, and \`A = g^a mod p\`, recovering \`a\` is believed computationally infeasible for sufficiently large \`p\` - directly the same hard-problem family ECC uses (Week 20's previous lesson), and a genuinely different hard problem from RSA's prime factorization, even though both ultimately serve similar purposes.

## Why an eavesdropper genuinely cannot compute the shared secret

An observer sees \`p\`, \`g\`, \`A\`, and \`B\` - **everything transmitted**. But computing \`g^(ab) mod p\` from only \`A = g^a mod p\` and \`B = g^b mod p\`, without knowing either \`a\` or \`b\` individually, is itself believed to be as hard as the discrete logarithm problem directly (this specific derived hardness assumption is called the **Diffie-Hellman problem**). This is the precise mathematical property that makes the "public exchange, private result" trick work at all.

## The gap DH alone doesn't close: authentication

It's important to be honest about DH's limitation, because it's a genuinely significant one: **basic Diffie-Hellman provides no authentication whatsoever.** If an attacker can actively intercept and modify traffic (not just passively observe it), they can perform a **man-in-the-middle attack**: establish one DH exchange with Alice (pretending to be Bob) and a separate DH exchange with Bob (pretending to be Alice), silently relaying and decrypting/re-encrypting everything that flows between them, with neither Alice nor Bob any the wiser. This is precisely why real protocols (TLS, covered fully in Week 21) combine DH with **digital signatures** - proving that the public DH values genuinely came from the party they claim to be from, closing exactly this gap.

## Hybrid encryption: the pattern virtually every real system uses

This directly answers the previous lesson's closing question. Given that asymmetric crypto is computationally expensive (previous lesson) and symmetric crypto needs a pre-shared key (Weeks 18-19) that two strangers don't have, **hybrid encryption** combines both, using each for exactly what it's best at:

\`\`\`
1. Use asymmetric crypto (RSA or, more commonly today, ECDH - elliptic-curve Diffie-Hellman)
   ONLY to establish a shared secret key between two parties who've never met.
2. Use that shared secret as a symmetric key (e.g., for AES-256-GCM) to encrypt
   the actual bulk data - fast, and reusing everything covered in Week 19.
\`\`\`

This is not a compromise or a workaround - it is the **standard, correct architecture** for essentially every secure communication protocol in wide use, including TLS/HTTPS (the protocol securing this very course's website, covered in full in Week 21), Signal's messaging protocol, SSH, and VPN protocols like WireGuard. Asymmetric crypto solves the *distribution* problem once, cheaply, per session; symmetric crypto handles the *bulk* encryption fast, for as much data as the session needs.

## Connecting this back to your own project's architecture

Your project doesn't need hybrid encryption at all, and it's worth understanding precisely why, as a genuinely instructive contrast: Steganaliz's \`encryptPayload()\` (Week 17/19) encrypts data **for the same person, at a later time** - there are not two separate parties who need to agree on a secret over an untrusted channel; there's one user who already knows their own password. This is exactly the scenario PBKDF2-derived AES-GCM is designed for, and exactly the scenario where introducing RSA or Diffie-Hellman would add substantial complexity and computational cost for no corresponding security benefit. Recognizing *when hybrid/asymmetric encryption is and isn't the right tool* - not just how it works - is itself a genuine, practical cryptographic engineering skill, and this contrast with your own project is a clean, concrete way to internalize it.

## Check your understanding

- Why does the man-in-the-middle vulnerability described above apply equally to *any* unauthenticated key-exchange scheme, not just Diffie-Hellman specifically - what would need to be added to any such scheme to close the gap, in general terms?
- If you were designing a system where two people needed to establish a secure channel and one of them already possessed the other's long-term public key (say, from a verified source), how would that change the man-in-the-middle risk profile compared to the fully anonymous DH exchange described in this lesson?
`,
  },
];
