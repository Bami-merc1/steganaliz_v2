import type { Detector, DetectorResult } from './types';
import { labelForScore } from './types';

// Zero-width Unicode characters are invisible when rendered but fully
// present in the raw byte stream. Their presence in a text file is
// near-deterministic evidence of intentional injection — they essentially
// never appear in natural, human-authored text.
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\u2060', // Word Joiner (used as our sentinel wrapper)
  '\uFEFF', // Zero Width No-Break Space / BOM (exclude position 0 — legitimate BOM)
];

const TEXT_EXTENSIONS = ['txt', 'md', 'html', 'xml', 'csv', 'log', 'rtf', 'js', 'ts', 'py', 'json', 'css'];

export const zeroWidthDetector: Detector = {
  id: 'zero-width',
  name: 'Zero-width character detector',
  weight: 1.3, // near-deterministic for text carriers
  supportedExtensions: TEXT_EXTENSIONS,

  detect: async (file: File): Promise<DetectorResult> => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      return {
        detectorId: 'zero-width',
        detectorName: 'Zero-width character detector',
        score: 0,
        label: labelForScore(0),
        applicable: false,
        details: 'Could not read file as text.',
      };
    }

    let zwCount = 0;
    const foundChars: string[] = [];

    for (const ch of ZERO_WIDTH_CHARS) {
      // Skip BOM at position 0 — that's legitimate UTF-8/UTF-16 encoding
      const searchFrom = (ch === '\uFEFF' && text[0] === '\uFEFF') ? 1 : 0;
      const occurrences = text.slice(searchFrom).split(ch).length - 1;
      if (occurrences > 0) {
        zwCount += occurrences;
        foundChars.push(`U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} ×${occurrences}`);
      }
    }

    // Our sentinel is '\u2060\u200B\u2060' — detect it specifically as a
    // strong signal that this specific tool's zero-width engine was used.
    const hasSentinel = text.includes('\u2060\u200B\u2060');

    let score = 0;
    if (zwCount > 0) {
      // Even 1 zero-width character is already suspicious in natural text.
      // Scale: 1 char → 50%, 10+ chars → 90%+, sentinel → 97%
      score = hasSentinel ? 97 : Math.min(92, 50 + Math.floor(zwCount * 4));
    }

    return {
      detectorId: 'zero-width',
      detectorName: 'Zero-width character detector',
      score,
      label: labelForScore(score),
      applicable: true,
      details: zwCount === 0
        ? 'No zero-width Unicode characters detected.'
        : `${zwCount} zero-width character(s) found${hasSentinel ? ' including Steganaliz sentinel sequence' : ''}: ${foundChars.join(', ')}`,
    };
  },
};