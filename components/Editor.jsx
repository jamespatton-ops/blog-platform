'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOSAVE_DELAY = 3000;
const PREVIEW_DELAY = 400;

export default function Editor({ initial }) {
  const [postId, setPostId] = useState(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.content_md ?? '');
  const [published, setPublished] = useState(initial?.status === 'PUBLISHED');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const autosaveTimer = useRef();
  const previewTimer = useRef();

  const persist = useCallback(
    async (override) => {
      setSaving(true);
      setError(null);
      try {
        const payload = {
          title: title.trim() || 'Untitled',
          content_md: body,
          published: override?.published ?? published
        };
        const response = await fetch(postId ? `/api/posts/${postId}` : '/api/posts', {
          method: postId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const json = await response.json();
        if (!postId && json.id) {
          setPostId(json.id);
        }
        if (typeof json.status === 'string') {
          setPublished(json.status === 'PUBLISHED');
        }
        setDirty(false);
        return json;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [body, postId, published, title]
  );

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
    if (!dirty) {
      return () => undefined;
    }
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      void persist();
    }, AUTOSAVE_DELAY);

    return () => {
      window.clearTimeout(autosaveTimer.current);
    };
  }, [dirty, persist, title, body]);

  async function togglePublish() {
    const next = !published;
    setPublished(next);
    const result = await persist({ published: next });
    if (!result) {
      setPublished(!next);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          {saving ? 'Saving…' : dirty ? 'Unsaved changes' : published ? 'Published' : 'Draft'}
        </span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={() => void persist()} disabled={saving}>
            Save
          </button>
          <button type="button" onClick={togglePublish}>
            {published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
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
          margin: '1.5rem 0 1rem',
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
              border: '1px solid rgba(0,0,0,0.12)',
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
            style={{ border: '1px solid rgba(0,0,0,0.12)', padding: '1rem', minHeight: '20vh' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
        {error && <p style={{ color: 'crimson', fontSize: '0.875rem' }}>{error}</p>}
      </div>
    </div>
  );
}
