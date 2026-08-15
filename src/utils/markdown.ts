export function renderMarkdown(md: string): string {
  let html = md.trim();

  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre style="font-family:var(--font-mono);font-size:12px;line-height:1.6;background:#1e2b37;color:#e8edf2;border-radius:6px;padding:16px;overflow-x:auto;margin:12px 0">${escaped.trim()}</pre>`;
  });

  html = html.replace(/`([^`]+)`/g,
    '<code style="font-family:var(--font-mono);font-size:12px;background:#f4f5f7;border:1px solid #dde1e7;border-radius:3px;padding:2px 6px;color:#1a1f2e">$1</code>'
  );

  html = html.replace(/^### (.*)$/gm,
    '<h3 style="font-size:15px;font-weight:600;color:#1a1f2e;margin:20px 0 6px">$1</h3>'
  );
  html = html.replace(/^## (.*)$/gm,
    '<h2 style="font-size:18px;font-weight:600;color:#1a1f2e;margin:28px 0 8px">$1</h2>'
  );

  html = html.replace(/\*\*(.*?)\*\*/g,
    '<strong style="font-weight:600;color:#1a1f2e">$1</strong>'
  );

  html = html.replace(/(\|.+\|\n\|[-\s|]+\|\n(?:\|.+\|\n?)+)/g, (block: string) => {
    const rows = block.trim().split('\n').filter((r) => !/^\|[-\s|]+\|$/.test(r));
    const [headerRow, ...bodyRows] = rows;
    const cells = (row: string) => row.split('|').slice(1, -1).map((c) => c.trim());
    const thead = `<tr>${cells(headerRow)
      .map((c) => `<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #dde1e7;font-size:12px;font-weight:600;color:#546e7a;background:#f4f5f7">${c}</th>`)
      .join('')}</tr>`;
    const tbody = bodyRows
      .map((r) => `<tr>${cells(r)
        .map((c) => `<td style="padding:8px 12px;border-bottom:1px solid #dde1e7;font-family:var(--font-mono);font-size:12px">${c}</td>`)
        .join('')}</tr>`)
      .join('');
    return `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #dde1e7;border-radius:4px;overflow:hidden"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  });

  html = html.replace(/^- (.*)$/gm,
    '<li style="margin:4px 0 4px 20px;list-style:disc;font-size:14px;color:#546e7a;line-height:1.6">$1</li>'
  );

  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p style="font-size:14px;color:#546e7a;line-height:1.7;margin:10px 0">${trimmed.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');

  return html;
}