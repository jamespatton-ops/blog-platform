'use client';

import { useEffect, useRef, useState } from 'react';

type EditorInitial = {
  id?: string;
  title?: string;
  content_md?: string;
  status?: 'DRAFT' | 'PUBLISHED';
};

const AUTOSAVE_DELAY = 3000;
const PREVIEW_DELAY = 400;

export default function Editor({ initial }: { initial?: EditorInitial }) {
  const [postId, setPostId] = useState<string | null>(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.content_md ?? '');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initial?.status ?? 'DRAFT');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const autosaveTimer = useRef<number>();
  const previewTimer = useRef<number>();

  useEffect(() => {
    const controller = new AbortController();
    window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      void fetch('/api/posts/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body }),
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((json) => setPreviewHtml(json.html ?? ''))
        .catch(() => {});
    }, PREVIEW_DELAY);
    return () => {
      controller.abort();
      window.clearTimeout(previewTimer.current);
    };
  }, [body]);

  useEffect(() => {
    if (!dirty) return;
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      void persist();
    }, AUTOSAVE_DELAY);
    return () => {
      window.clearTimeout(autosaveTimer.current);
    };
  }, [title, body, dirty]);

  async function persist(extra?: Partial<{ status: 'DRAFT' | 'PUBLISHED' }>) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title,
      content_md: body,
      status: extra?.status ?? status
    };
    const response = await fetch(postId ? `/api/posts/${postId}` : '/api/posts', {
      method: postId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setSaving(false);
      return null;
    }
    const json = await response.json();
    if (!postId && json.id) {
      setPostId(json.id as string);
    }
    if (json.status && json.status !== status) {
      setStatus(json.status);
    }
    setDirty(false);
    setSaving(false);
    return json;
  }

  async function togglePublish() {
    const current = status;
    const next = current === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setStatus(next);
    const result = await persist({ status: next });
    if (!result) {
      setStatus(current);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          {saving ? 'Saving…' : status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </span>
        <button type="button" onClick={togglePublish}>
          {status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        </button>
      </div>
      <input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setDirty(true);
        }}
        placeholder="Title"
        style={{
          width: '100%',
          fontSize: '1.75rem',
          border: 0,
          outline: 'none',
          margin: '1rem 0',
          fontWeight: 600
        }}
      />
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Draft
          </span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setDirty(true);
            }}
            placeholder="Write in Markdown"
            style={{
              width: '100%',
              minHeight: '60vh',
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '1rem',
              resize: 'vertical'
            }}
          />
        </label>
        <section>
          <div style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Preview
          </div>
          <div
            style={{ border: '1px solid rgba(0,0,0,0.1)', padding: '1rem', minHeight: '20vh' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      </div>
    </div>
  );
}
