export function renderMarkdown(md: string): string {
  let html = md.trim();

  // Fenced code blocks first, so their contents aren't touched by other rules
  html = html.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="mono text-xs leading-relaxed bg-stgBlack text-stgTextOnDark rounded px-4 py-3 overflow-x-auto my-3">${escaped.trim()}</pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="mono text-xs bg-stgBg border border-stgBorder rounded px-1.5 py-0.5">$1</code>');

  // Headers
  html = html.replace(/^### (.*)$/gm, '<h3 class="text-base font-semibold text-stgTextPrimary mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="text-lg font-semibold text-stgTextPrimary mt-6 mb-2">$1</h2>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-stgTextPrimary">$1</strong>');

  // Tables (simple pipe-delimited, header row + separator row)
  html = html.replace(/(\|.+\|\n\|[-\s|]+\|\n(?:\|.+\|\n?)+)/g, (block: string) => {
    const rows = block.trim().split('\n').filter((r) => !/^\|[-\s|]+\|$/.test(r));
    const [headerRow, ...bodyRows] = rows;
    const cells = (row: string) => row.split('|').slice(1, -1).map((c) => c.trim());
    const headerCells = cells(headerRow);
    const thead = `<tr>${headerCells.map((c) => `<th class="text-left px-3 py-2 border-b border-stgBorderStrong text-xs font-medium text-stgTextSecondary">${c}</th>`).join('')}</tr>`;
    const tbody = bodyRows
      .map((r) => `<tr>${cells(r).map((c) => `<td class="px-3 py-2 border-b border-stgBorder mono text-xs">${c}</td>`).join('')}</tr>`)
      .join('');
    return `<table class="w-full my-3 border border-stgBorder rounded overflow-hidden"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  });

  // List items
  html = html.replace(/^- (.*)$/gm, '<li class="ml-4 list-disc text-sm text-stgTextSecondary leading-relaxed">$1</li>');

  // Paragraphs: wrap remaining bare lines that aren't already HTML
  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p class="text-sm text-stgTextSecondary leading-relaxed my-3">${trimmed.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');

  return html;
}