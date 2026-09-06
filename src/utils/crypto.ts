const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(
  plaintext: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const key = await deriveKey(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  const framed = new Uint8Array(salt.length + iv.length + ciphertext.length);
  framed.set(salt, 0);
  framed.set(iv, salt.length);
  framed.set(ciphertext, salt.length + iv.length);
  return framed;
}

export async function decryptPayload(
  framed: Uint8Array,
  password: string
): Promise<Uint8Array> {
  if (framed.length < SALT_LENGTH_BYTES + IV_LENGTH_BYTES) {
    throw new Error('Encrypted payload is malformed or truncated.');
  }

  const salt = framed.slice(0, SALT_LENGTH_BYTES);
  const iv = framed.slice(SALT_LENGTH_BYTES, SALT_LENGTH_BYTES + IV_LENGTH_BYTES);
  const ciphertext = framed.slice(SALT_LENGTH_BYTES + IV_LENGTH_BYTES);
  const key = await deriveKey(password, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return new Uint8Array(plaintextBuffer);
  } catch {
    const delay = 150 + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delay));
    throw new Error(
      'Decryption failed. Incorrect password, or the file does not contain a valid encrypted payload.'
    );
  }
}

export function estimatePasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const varietyScore = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (password.length >= 12 && varietyScore >= 3) return 'strong';
  if (password.length >= 8 && varietyScore >= 2) return 'fair';
  return 'weak';
}


export function renderMarkdown(md: string): string {
  let html = md.trim();

  // --- Code blocks (protect first) ---
  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre style="font-family:var(--font-mono);font-size:12.5px;line-height:1.7;background:#14212b;color:#eef2f6;border-radius:8px;padding:18px 20px;overflow-x:auto;margin:20px 0">${escaped.trim()}</pre>`;
  });

  // --- Inline code ---
  html = html.replace(/`([^`]+)`/g,
    '<code style="font-family:var(--font-mono);font-size:12.5px;background:#f1f2f5;border:1px solid #dde1e7;border-radius:4px;padding:2px 6px;color:#000">$1</code>'
  );

  // --- Headers ---
  html = html.replace(/^### (.*)$/gm,
    '<h3 style="font-size:16px;font-weight:700;color:#000;margin:28px 0 10px">$1</h3>'
  );
  html = html.replace(/^## (.*)$/gm,
    '<h2 style="font-size:20px;font-weight:700;color:#000;margin:36px 0 14px;padding-top:8px;border-top:1px solid #ece9e1">$1</h2>'
  );

  // --- Bold, then italic ---
  html = html.replace(/\*\*(.*?)\*\*/g,
    '<strong style="font-weight:700;color:#000">$1</strong>'
  );
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,
    '$1<em style="font-style:italic;color:#000">$2</em>'
  );

  // --- Tables ---
  html = html.replace(/(\|.+\|\n\|[-\s|]+\|\n(?:\|.+\|\n?)+)/g, (block: string) => {
    const rows = block.trim().split('\n').filter((r) => !/^\|[-\s|]+\|$/.test(r));
    const [headerRow, ...bodyRows] = rows;
    const cells = (row: string) => row.split('|').slice(1, -1).map((c) => c.trim());
    const thead = `<tr>${cells(headerRow)
      .map((c) => `<th style="text-align:left;padding:10px 14px;border-bottom:2px solid #dde1e7;font-size:12px;font-weight:700;color:#000;background:#f4f5f7">${c}</th>`)
      .join('')}</tr>`;
    const tbody = bodyRows
      .map((r) => `<tr>${cells(r)
        .map((c) => `<td style="padding:10px 14px;border-bottom:1px solid #dde1e7;font-family:var(--font-mono);font-size:12px;color:#000">${c}</td>`)
        .join('')}</tr>`)
      .join('');
    return `<table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #dde1e7;border-radius:6px;overflow:hidden">${thead}${tbody}</table>`;
  });

  // Matches "**1. Title.**" / "**Word.**" / "**Word:**" bold lead-ins,
  // used to split a single prose block into distinct visual items even
  // when the source never put them on separate lines.
  const inlineLeadRe = /<strong[^>]*>((?:\d+\.|[ivxlcdm]+\.)?\s*[^<]*?[.:])<\/strong>/gi;

  const blocks = html.split('\n\n');
  const rendered: string[] = [];

  const listLineRe = /^(?:\*\*)?(-|\d+\.|[ivxlcdm]+\.)(?:\*\*)?\s+(.*)$/i;

  for (const rawBlock of blocks) {
    const trimmed = rawBlock.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('<')) {
      rendered.push(trimmed);
      continue;
    }

    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    const isListBlock = lines.length > 0 && lines.every((l) => listLineRe.test(l));

    if (isListBlock) {
      const items = lines.map((line) => {
        const m = line.match(listLineRe);
        const body = m ? m[2] : line;
        return `<li style="margin:0 0 14px 0;padding-left:2px;line-height:1.75;color:#000;font-size:14.5px">${body}</li>`;
      }).join('');
      rendered.push(`<ul style="margin:16px 0;padding-left:22px;list-style:disc">${items}</ul>`);
      continue;
    }

    const text = lines.join(' ');

    // How many bold lead-ins does this paragraph contain?
    const leadMatches = [...text.matchAll(inlineLeadRe)];

    if (leadMatches.length >= 2) {
      // Multiple inline "**N. Title.**" segments in one prose block -
      // split into one card-like item per lead-in instead of one wall
      // of text, using their positions to slice the surrounding prose.
      const items: string[] = [];
      for (let i = 0; i < leadMatches.length; i++) {
        const start = leadMatches[i].index ?? 0;
        const end = i + 1 < leadMatches.length ? (leadMatches[i + 1].index ?? text.length) : text.length;
        const segment = text.slice(start, end).trim();
        const segMatch = segment.match(/^<strong[^>]*>(.*?)<\/strong>\s*(.*)$/);
        if (segMatch) {
          items.push(
            `<div style="margin:0 0 16px 0">
              <p style="font-weight:700;color:#000;font-size:14.5px;margin:0 0 6px 0">${segMatch[1]}</p>
              <p style="color:#000;font-size:14.5px;line-height:1.8;margin:0">${segMatch[2]}</p>
            </div>`
          );
        } else {
          items.push(`<p style="color:#000;font-size:14.5px;line-height:1.8;margin:0 0 16px 0">${segment}</p>`);
        }
      }
      rendered.push(`<div style="margin:16px 0">${items.join('')}</div>`);
      continue;
    }

    if (leadMatches.length === 1) {
      const m = text.match(/^<strong[^>]*>(.*?)<\/strong>\s*(.+)$/);
      if (m && m[2].length > 0) {
        rendered.push(
          `<div style="margin:16px 0">
            <p style="font-weight:700;color:#000;font-size:14.5px;margin:0 0 6px 0">${m[1]}</p>
            <p style="color:#000;font-size:14.5px;line-height:1.8;margin:0">${m[2]}</p>
          </div>`
        );
        continue;
      }
    }

    rendered.push(`<p style="font-size:14.5px;color:#000;line-height:1.8;margin:16px 0">${text}</p>`);
  }

  return rendered.join('\n');
}
