import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import sanitize from 'rehype-sanitize';

export async function mdToHtml(md: string) {
  const compiled = await remark().use(gfm).use(html).process(md);
  const safe = await unified()
    .use(rehypeParse, { fragment: true })
    .use(sanitize)
    .use(rehypeStringify)
    .process(compiled.toString());

  return String(safe);
}
