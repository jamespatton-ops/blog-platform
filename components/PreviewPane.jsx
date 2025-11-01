'use client';

import { useEffect, useMemo, useState } from 'react';
import { createMarkdownRenderer } from '@/lib/markdown';

export function PreviewPane({ markdown }) {
  const renderer = useMemo(() => createMarkdownRenderer(), []);
  const [html, setHtml] = useState('');

  useEffect(() => {
    let active = true;
    renderer
      .process(markdown ?? '')
      .then((file) => {
        if (active) {
          setHtml(String(file.value));
        }
      })
      .catch(() => {
        if (active) {
          setHtml('');
        }
      });
    return () => {
      active = false;
    };
  }, [markdown, renderer]);

  return <div className="preview-pane prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
