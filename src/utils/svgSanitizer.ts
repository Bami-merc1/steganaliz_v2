// SVG files can contain inline <script> tags and event-handler attributes
// (onload, onerror, etc.) that execute when rendered as image/svg+xml.
// This sanitizer strips those before any SVG is passed to the engine layer,
// per the project doc's XSS prevention defense.
// Note: this sanitizer runs on SVG CARRIERS only - extracted payloads are
// always rendered as inert plaintext (see ExtractPanel), not as SVG.

const DANGEROUS_ELEMENTS = ['script', 'foreignObject', 'use'];
const DANGEROUS_ATTR_PREFIXES = ['on']; // onclick, onload, onerror, etc.
const DANGEROUS_ATTRS = ['href', 'xlink:href']; // can point to javascript: URIs

function stripDangerousElements(svg: string): string {
  let result = svg;
  for (const tag of DANGEROUS_ELEMENTS) {
    // Remove opening + closing tag pairs and everything between them.
    const openPattern = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, 'gi');
    const selfClosePattern = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = result.replace(openPattern, '').replace(selfClosePattern, '');
  }
  return result;
}

function stripDangerousAttributes(svg: string): string {
  let result = svg;

  // Strip event-handler attributes (on*="..." or on*='...')
  for (const prefix of DANGEROUS_ATTR_PREFIXES) {
    const pattern = new RegExp(`\\s${prefix}\\w+\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi');
    result = result.replace(pattern, '');
  }

  // Strip href/xlink:href attributes containing javascript: URIs
  for (const attr of DANGEROUS_ATTRS) {
    const pattern = new RegExp(
      `\\s${attr.replace(':', '\\:')}\\s*=\\s*(?:"javascript:[^"]*"|'javascript:[^']*')`,
      'gi'
    );
    result = result.replace(pattern, '');
  }

  return result;
}

export function sanitizeSvg(svgContent: string): string {
  let result = stripDangerousElements(svgContent);
  result = stripDangerousAttributes(result);
  return result;
}

export async function sanitizeSvgFile(file: File): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'svg') return file; // not an SVG, pass through

  const text = await file.text();
  const sanitized = sanitizeSvg(text);
  return new File([sanitized], file.name, { type: 'image/svg+xml' });
}