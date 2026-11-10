/**
 * Minimal, safe rich text for record bodies.
 *   [[ID]] / [[ID|label]]  → link to the record's permanent URL
 *   **bold**, *emphasis*
 *   Paragraph prefixes: "## " heading, "> " quotation
 * All other input is HTML-escaped.
 */
import type { Store } from './data/schema.ts';
import { recordIndex, href } from './site.ts';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function inline(text: string, s: Store, opts: { linkClass?: string } = {}): string {
  const idx = recordIndex(s);
  let out = esc(text);
  out = out.replace(/\[\[([A-Z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_m, id: string, label?: string) => {
    const e = idx.get(id);
    if (!e) return esc(label ?? id);
    const text = label ?? (e.kind === 'Division' || e.kind === 'Bill' ? id : e.label);
    const demo = e.dataset === 'demonstration' ? ' data-demo="true"' : '';
    return `<a href="${href(e.path)}" class="${opts.linkClass ?? 'reflink'}"${demo} title="${esc(`${e.kind} ${id}: ${e.label}`)}">${text}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*]+)\*(?!\w)/g, '$1<em>$2</em>');
  return out;
}

export function block(text: string, s: Store, headingTag = 'h3'): string {
  if (text.startsWith('## ')) return `<${headingTag}>${inline(text.slice(3), s)}</${headingTag}>`;
  if (text.startsWith('> ')) return `<blockquote><p>${inline(text.slice(2), s)}</p></blockquote>`;
  return `<p>${inline(text, s)}</p>`;
}

export function blocks(paragraphs: string[], s: Store, headingTag = 'h3'): string {
  return paragraphs.map((p) => block(p, s, headingTag)).join('\n');
}

/** Plain text (for search index and meta descriptions). */
export function plain(text: string): string {
  return text
    .replace(/\[\[([A-Z0-9-]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([A-Z0-9-]+)\]\]/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/^(## |> )/, '');
}
