/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side text extractors for vault ingestion.
 * All processing stays on-device. Heavy WASM (pdf.js / Tesseract) is loaded
 * only when needed via dynamic import so the main bundle stays small.
 */

export type ExtractorKind = 'text' | 'pdf' | 'image' | 'unsupported';

export interface ExtractResult {
  text: string;
  kind: ExtractorKind;
  /** True when text came from OCR or a partial PDF parse */
  partial?: boolean;
  warning?: string;
  pageCount?: number;
  meta?: Record<string, string>;
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'py',
  'html', 'css', 'yaml', 'yml', 'env', 'log', 'rtf', 'org', 'sh', 'sql',
  'toml', 'conf', 'xml', 'svg', 'ini', 'cfg', 'rs', 'go', 'java', 'kt',
  'swift', 'c', 'cpp', 'h', 'hpp', 'rb', 'php', 'vue', 'svelte',
]);

const PDF_EXTENSIONS = new Set(['pdf']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif']);

/** Max bytes we will attempt to fully load into memory for extraction */
export const MAX_EXTRACT_BYTES = 20 * 1024 * 1024; // 20 MB

export function extensionOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isSupportedIngestExtension(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext) || PDF_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext);
}

export function classifyExtension(ext: string): ExtractorKind {
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'unsupported';
}

/**
 * Extract searchable text from a File. Routes by extension.
 * Never throws for unsupported/corrupt files — returns empty text + warning.
 */
export async function extractFromFile(file: File): Promise<ExtractResult> {
  const ext = extensionOf(file.name);

  if (file.size > MAX_EXTRACT_BYTES) {
    return {
      text: '',
      kind: classifyExtension(ext),
      warning: `Skipped (file larger than ${Math.round(MAX_EXTRACT_BYTES / 1024 / 1024)} MB)`,
    };
  }

  const kind = classifyExtension(ext);
  try {
    if (kind === 'text') {
      const text = await file.text();
      return { text, kind: 'text' };
    }
    if (kind === 'pdf') {
      return await extractPdf(file);
    }
    if (kind === 'image') {
      return await extractImage(file);
    }
    return { text: '', kind: 'unsupported', warning: `Unsupported type .${ext}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', kind, warning: `Extract failed: ${msg}` };
  }
}

async function extractPdf(file: File): Promise<ExtractResult> {
  try {
    const pdfjs: any = await import('pdfjs-dist').catch(() => null);
    if (pdfjs?.getDocument) {
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {
          /* worker optional */
        }
      }

      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
      const pageCount: number = doc.numPages;
      const parts: string[] = [];

      const maxPages = Math.min(pageCount, 80);
      for (let i = 1; i <= maxPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items as { str?: string }[])
          .map(item => item.str || '')
          .join(' ');
        if (pageText.trim()) parts.push(pageText);
        if (i % 4 === 0) await yieldToMain();
      }

      const text = parts.join('\n\n').trim();
      return {
        text,
        kind: 'pdf',
        pageCount,
        partial: pageCount > maxPages || text.length < 20,
        warning:
          pageCount > maxPages
            ? `Indexed first ${maxPages} of ${pageCount} pages`
            : text.length < 20
              ? 'Little extractable text (may be scanned/image PDF — try OCR on exported images)'
              : undefined,
        meta: { pages: String(pageCount) },
      };
    }
  } catch (err) {
    console.warn('pdfjs extract failed, trying lightweight parser', err);
  }

  const buf = await file.arrayBuffer();
  const text = extractPdfTextLightweight(new Uint8Array(buf));
  return {
    text,
    kind: 'pdf',
    partial: true,
    warning: text.length < 40
      ? 'Lightweight PDF parse found little text. Install pdfjs-dist for better extraction.'
      : 'Extracted with lightweight PDF parser (pdfjs-dist not installed)',
  };
}

function extractPdfTextLightweight(bytes: Uint8Array): string {
  let raw = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    raw += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  const pieces: string[] = [];

  const tjRe = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(raw)) !== null) {
    const inner = m[0].replace(/\)\s*Tj$/, '').slice(1);
    const decoded = decodePdfLiteral(inner);
    if (decoded.trim()) pieces.push(decoded);
  }

  const arrRe = /\[([^\]]{0,4000})\]\s*TJ/g;
  while ((m = arrRe.exec(raw)) !== null) {
    const partRe = /\((?:\\.|[^\\)])*\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = partRe.exec(m[1])) !== null) {
      const decoded = decodePdfLiteral(pm[0].slice(1, -1));
      if (decoded.trim()) pieces.push(decoded);
    }
  }

  const hexRe = /<([0-9A-Fa-f]{4,})>\s*Tj/g;
  while ((m = hexRe.exec(raw)) !== null) {
    const decoded = decodePdfHex(m[1]);
    if (decoded.trim()) pieces.push(decoded);
  }

  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

function decodePdfLiteral(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHex(hex: string): string {
  const clean = hex.replace(/\s/g, '');
  if (clean.length % 2 !== 0) return '';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out;
  }
  return String.fromCharCode(...bytes);
}

async function extractImage(file: File): Promise<ExtractResult> {
  const meta: Record<string, string> = {
    name: file.name,
    type: file.type || 'image',
    size: String(file.size),
  };

  const nameText = file.name.replace(/[_\-.]+/g, ' ').replace(/\.[^.]+$/, '');

  try {
    const tesseract: any = await import('tesseract.js').catch(() => null);
    if (tesseract?.recognize) {
      const result = await tesseract.recognize(file, 'eng', {
        logger: () => {},
      });
      const ocrText = (result?.data?.text || '').trim();
      if (ocrText.length > 8) {
        return {
          text: `${nameText}\n\n${ocrText}`,
          kind: 'image',
          partial: false,
          meta,
        };
      }
      return {
        text: nameText,
        kind: 'image',
        partial: true,
        warning: 'OCR returned little text',
        meta,
      };
    }
  } catch (err) {
    console.warn('OCR failed', err);
  }

  return {
    text: nameText,
    kind: 'image',
    partial: true,
    warning:
      'Indexed by filename only. Install tesseract.js for on-device OCR of image text.',
    meta,
  };
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}
