export function renderMarkdown(md: string): string {
  let html = md.trim();

  // --- Code blocks (protect first so nothing inside gets mangled) ---
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

  // --- Bold, then italic (bold first so ** isn't eaten by the * pass) ---
  html = html.replace(/\*\*(.*?)\*\*/g,
    '<strong style="font-weight:700;color:#000">$1</strong>'
  );
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,
    '$1<em style="font-style:italic;color:#000">$2</em>'
  );

  // --- Tables (unchanged structurally, text forced to black) ---
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

  // --- Split into blocks on blank lines ---
  const blocks = html.split('\n\n');
  const rendered: string[] = [];

  // Matches a list-style lead line: "- text", "1. text", "i. text",
  // optionally with the marker wrapped in **bold**.
  const listLineRe = /^(?:\*\*)?(-|\d+\.|[ivxlcdm]+\.)(?:\*\*)?\s+(.*)$/i;

  for (const rawBlock of blocks) {
    const trimmed = rawBlock.trim();
    if (!trimmed) continue;

    // Already-rendered HTML (table/header/pre) passes through untouched.
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
      rendered.push(
        `<ul style="margin:16px 0;padding-left:22px;list-style:disc">${items}</ul>`
      );
      continue;
    }

    // Single paragraph line, joining any internal wraps with a space.
    const text = lines.join(' ');

    // "Lead-bold" pattern: a paragraph that opens with a bold phrase,
    // e.g. "**Salting.** A random value..." - split it into a bold
    // lead line plus its explanation, with real spacing between them.
    const leadMatch = text.match(/^<strong[^>]*>(.*?)<\/strong>\s*(.+)$/);
    if (leadMatch && leadMatch[2].length > 0) {
      rendered.push(
        `<div style="margin:16px 0">
          <p style="font-weight:700;color:#000;font-size:14.5px;margin:0 0 6px 0">${leadMatch[1]}</p>
          <p style="color:#000;font-size:14.5px;line-height:1.8;margin:0">${leadMatch[2]}</p>
        </div>`
      );
      continue;
    }

    rendered.push(
      `<p style="font-size:14.5px;color:#000;line-height:1.8;margin:16px 0">${text}</p>`
    );
  }

  return rendered.join('\n');
}