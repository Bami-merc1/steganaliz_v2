import type { Lesson } from '../../types/curriculum';

export const WEEK_21_LESSONS: Lesson[] = [
  {
    id: 'w21-digital-signatures',
    title: 'Digital signatures: proving authorship without proving identity in person',
    summary: 'How a private key signs a hash to create non-repudiable proof of authenticity - and why signing a hash, not the message itself, matters.',
    estimatedMinutes: 25,
    content: `
## The problem digital signatures solve

Encryption (Weeks 18-20) answers "how do I keep this secret?" **Digital signatures** answer a different question entirely: **"how do I prove I - and only I - created or approved this exact piece of data, in a way a third party can independently verify, without needing to trust me directly?"** This is a genuinely different security goal from confidentiality, and a signature scheme can exist entirely independent of any encryption - you can sign a message that stays in plain, readable text, purely to prove its origin and integrity.

## The mechanism: reversing the public/private key roles

Recall Week 20: with encryption, anyone encrypts with the **public** key, and only the private-key holder can decrypt. Digital signatures **invert** this relationship: the private-key holder **signs** using their private key, and **anyone** can verify the signature using the corresponding public key.

\`\`\`
Encryption:  anyone encrypts (public key) → only private-key holder decrypts
Signing:     only private-key holder signs (private key) → anyone verifies (public key)
\`\`\`

This inversion is what delivers the specific guarantee a signature needs: since only the private-key holder could have produced a valid signature, a successful verification proves the message came from (or was approved by) that specific key holder - a property called **non-repudiation**, meaning the signer cannot later credibly deny having signed it (assuming their private key was never compromised).

## Why you sign a hash, not the raw message

A crucial, easily-overlooked detail: signature schemes don't operate directly on an arbitrarily large message - they sign a **hash of the message** (recall Week 17's hash functions), for two concrete, practical reasons:

**1. Efficiency.** Asymmetric operations (Week 20) are computationally expensive - signing a fixed-size 256-bit hash is vastly cheaper than running the same signing operation across an entire multi-gigabyte file.

**2. It still proves authenticity of the whole message.** Because a secure hash function is **collision-resistant** (Week 17), an attacker cannot find a *different* message that produces the same hash - meaning a valid signature over a message's hash is, for all practical purposes, exactly as strong a proof of the *original* message's authenticity as signing the whole message directly would be. This is precisely why Week 17's collision-resistance property matters so much for signatures specifically, as that lesson's check-your-understanding question anticipated: **a hash function with weak collision resistance would let an attacker forge a second, different message sharing a legitimately-signed hash - completely undermining the signature's guarantee**, even though the signing algorithm itself remains mathematically sound.

## The full signing and verification flow

\`\`\`
SIGNING (only the private-key holder can do this):
  1. Compute hash = SHA-256(message)
  2. signature = Sign(private_key, hash)
  3. Send (message, signature) to the recipient

VERIFICATION (anyone with the public key can do this):
  1. Recompute hash = SHA-256(received_message)
  2. valid = Verify(public_key, hash, signature)
  3. If valid: the message is provably unmodified AND provably signed by the private-key holder
     If invalid: EITHER the message was altered in transit OR the signature doesn't match this key
\`\`\`

Notice this single mechanism delivers **two** guarantees simultaneously: **integrity** (the message wasn't altered - because even a one-bit change would produce a different hash, per Week 17's avalanche effect, causing verification to fail) and **authenticity** (it genuinely came from the claimed private-key holder). This dual guarantee is directly analogous to what GCM's authentication tag provides for encrypted data (Week 19) - both are, structurally, "a keyed proof of integrity," just applied in different contexts (symmetric shared-secret vs. asymmetric key-pair).

## RSA signatures vs. ECDSA

Both major asymmetric families from Week 20 have corresponding signature schemes: **RSA signatures** use RSA's same underlying hard problem (factoring) in a signing-specific construction; **ECDSA (Elliptic Curve Digital Signature Algorithm)** does the equivalent using elliptic-curve math. As with encryption, ECDSA signatures are considerably smaller and faster to compute/verify than RSA signatures at equivalent security levels, which is why ECDSA (and its more modern relative, EdDSA) has become the dominant choice in newer systems, including most cryptocurrency transaction signing and modern TLS certificate signing.

## Why this matters concretely, beyond the abstract guarantee

Software update mechanisms verify a cryptographic signature before installing an update, specifically to prevent an attacker who's compromised a distribution server from pushing malicious code - the signature proves the update genuinely came from the legitimate developer's private key, independent of how trustworthy the distribution channel itself is. Git commit signing works identically: a signed commit cryptographically proves a specific person's key authored it, independent of whether someone else had write access to the repository. Both are direct, practical instances of the exact sign/verify flow above, with "message" instantiated as "software binary" or "commit content" respectively.

## Check your understanding

- Why would a signature scheme that signed the raw message directly, rather than its hash, still technically work for small messages - and at what point does the "sign a hash instead" optimization become not just convenient but practically necessary?
- If an attacker stole someone's *public* key, what could they do with it regarding that person's signatures - could they forge new valid signatures, or only verify existing ones? Contrast this explicitly with what stealing someone's *private* key would enable.
`,
  },
  {
    id: 'w21-pki-tls',
    title: 'Public Key Infrastructure and how HTTPS actually secures a connection',
    summary: 'Certificate Authorities, the trust chain, and the full TLS handshake - tying together every prior lesson in this phase into the protocol securing the modern web.',
    estimatedMinutes: 35,
    content: `
## The remaining gap: whose public key is this, really?

Digital signatures (previous lesson) let you verify that a message was signed by *the holder of a specific private key* - but they don't, by themselves, answer a separate and equally important question: **how do you know a given public key genuinely belongs to the party you think it belongs to, and not to an attacker impersonating them?** This is exactly the man-in-the-middle gap flagged at the end of Week 20's Diffie-Hellman lesson, and **Public Key Infrastructure (PKI)** is the system built to close it.

## Certificates: a public key, bound to an identity, signed by someone you trust

A **digital certificate** bundles a public key together with identifying information (a domain name, an organization name) and is itself **digitally signed** by a trusted third party - directly applying the previous lesson's signature mechanism, just with the "message" being the bundle of public key plus identity, rather than an arbitrary document.

\`\`\`
Certificate contents (simplified):
  Subject: steganaliz.emerc.site
  Public key: [the site's actual public key]
  Issuer: [a Certificate Authority]
  Signature: [the CA's signature over everything above]
\`\`\`

## Certificate Authorities (CAs): the trust anchor

A **Certificate Authority** is an organization whose job is to verify that whoever requests a certificate for a given domain genuinely controls that domain, and then sign a certificate attesting to that binding. Your browser (and operating system) ships with a pre-installed list of CA public keys it's configured to trust unconditionally - when your browser receives a website's certificate, it checks whether the certificate's signature verifies correctly against a CA public key it already trusts.

\`\`\`
Trust flows in one direction, established in advance:
  Your browser trusts [pre-installed CA public keys]
    → CA signs [website's certificate]
      → your browser can now trust [the website's public key], transitively
\`\`\`

This is a direct, practical solution to Week 20's man-in-the-middle gap: an attacker attempting to impersonate a website would need a certificate for that domain signed by a CA your browser already trusts - and legitimate CAs are specifically designed (through domain-validation procedures) not to issue one to anyone who doesn't actually control the domain in question.

## The certificate chain: CAs signing other CAs

In practice, trust rarely flows in a single hop. A **root CA**'s key is kept extremely tightly guarded (often offline, used only rarely) and instead signs certificates for **intermediate CAs**, which do the actual day-to-day certificate issuance. Your browser verifies a **chain**: the website's certificate is signed by an intermediate CA, whose own certificate is signed by a root CA your browser trusts directly - each link verified via the previous lesson's signature-verification mechanism, chained together.

## TLS: putting every lesson in this phase together into one handshake

TLS (Transport Layer Security - what makes "HTTPS" secure) is where every single concept from this entire cryptography phase converges into one working protocol. A simplified (modern TLS 1.3-style) handshake:

\`\`\`
1. Client connects; server sends its certificate (containing its public key,
   signed by a CA the client trusts) - Week 21's PKI, this lesson.

2. Client verifies the certificate chain up to a trusted root CA - Week 21's
   digital signatures, previous lesson.

3. Client and server perform an (elliptic-curve) Diffie-Hellman key exchange,
   AUTHENTICATED using the server's now-verified public key, closing exactly
   the man-in-the-middle gap flagged at the end of Week 20.

4. Both sides derive a shared symmetric session key from the DH exchange -
   Week 20's hybrid-encryption pattern, applied directly.

5. All subsequent traffic is encrypted using a fast symmetric cipher
   (commonly AES-GCM or ChaCha20) under that session key - Weeks 18-19.
\`\`\`

Every phase of this course's cryptography material has a direct, load-bearing role in this single handshake: hashing (Week 17) underlies the certificate signatures; symmetric encryption (Weeks 18-19) secures the bulk traffic; asymmetric crypto and key exchange (Week 20) establish the session key safely; and digital signatures plus PKI (Week 21) solve the authentication problem that raw Diffie-Hellman alone cannot. **There is no single "the encryption algorithm" in HTTPS - it's an orchestrated system built from every primitive this phase has covered, each doing the specific job it's best suited for.**

## Why your own project's terms explicitly reference this

Recall your project's \`TermsModal.tsx\`, which references GDPR, data-minimisation principles, and confirms all processing stays client-side. The transport connection delivering Steganaliz's own application code to a user's browser (via \`https://steganaliz.emerc.site\`) is itself secured by exactly this TLS handshake - meaning even though your application performs no server-side processing of user files, the initial page load and asset delivery still depend on the entire chain covered in this lesson to guarantee the code the user's browser executes hasn't been tampered with in transit.

## What happens when trust breaks: certificate warnings and revocation

If a certificate's signature doesn't verify, has expired, or was issued for a different domain than the one being visited, the browser shows an explicit warning rather than silently proceeding - precisely because silently trusting an unverifiable certificate would reopen the man-in-the-middle vulnerability this entire system exists to close. **Certificate revocation** (a CA declaring a previously-issued certificate no longer valid, typically because its private key was compromised) is handled via mechanisms like OCSP (Online Certificate Status Protocol) - a real, necessary complexity this course only gestures at, since a compromised private key must be revocable even before its certificate's natural expiry date, or the entire trust chain remains vulnerable for however long remains on that certificate.

## Closing the loop on this entire phase

Six weeks ago, this phase began with XOR and Base64 - the smallest, simplest possible building blocks. It ends here, with those same building blocks (hashing, symmetric ciphers, asymmetric key exchange, signatures) composed into the protocol that secures nearly every secure connection on the modern internet. This is the same throughline your Week 15 capstone lesson names explicitly for steganography and steganalysis: **no individual primitive is "the whole answer" - real-world security is what emerges when each piece is combined correctly, with each one's specific, well-understood guarantee covering exactly the gap the others leave open.**

## Check your understanding

- Why is a root CA's private key kept especially tightly guarded, offline, and rarely used, compared to an intermediate CA's key - what would a compromise of each one respectively allow an attacker to do, and why is the potential damage so different in scale?
- Trace through what would happen, step by step, if an attacker managed to get a fraudulent certificate for \`steganaliz.emerc.site\` improperly issued by a CA your browser trusts (a rare but real, historically-occurring failure mode) - at which specific step of the TLS handshake above would this become exploitable, and what does your answer suggest about why CAs themselves are high-value targets?
`,
  },
];
