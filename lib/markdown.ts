import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import { rehype } from 'rehype';
import sanitize from 'rehype-sanitize';

export async function mdToHtml(markdown: string): Promise<string> {
  const compiled = await remark().use(gfm).use(html).process(markdown);
  const safe = await rehype().use(sanitize).process(compiled.toString());
  return safe.toString();
}
