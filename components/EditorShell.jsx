'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PreviewPane } from './PreviewPane';

const AUTOSAVE_DELAY_MS = 3000;

export function EditorShell({ initialPost, themes = [] }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [content, setContent] = useState(initialPost?.content_md ?? '');
  const [themeId, setThemeId] = useState(initialPost?.themeId ?? '');
  const [status, setStatus] = useState(initialPost?.status ?? 'DRAFT');
  const [postId, setPostId] = useState(initialPost?.id ?? null);
  const [slug, setSlug] = useState(initialPost?.slug ?? '');
  const [showPreview, setShowPreview] = useState(true);
  const [savingState, setSavingState] = useState('idle');
  const lastSavedRef = useRef({
    title: initialPost?.title ?? '',
    content: initialPost?.content_md ?? '',
    status: initialPost?.status ?? 'DRAFT',
    themeId: initialPost?.themeId ?? ''
  });
  const saveTimeoutRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  const snapshot = useMemo(
    () => ({
      title,
      content,
      status,
      themeId: themeId || ''
    }),
    [title, content, status, themeId]
  );

  const dirty = useMemo(() => {
    const last = lastSavedRef.current;
    return (
      snapshot.title !== last.title ||
      snapshot.content !== last.content ||
      snapshot.status !== last.status ||
      snapshot.themeId !== last.themeId
    );
  }, [snapshot]);

  const persist = useCallback(
    async (nextSnapshot) => {
      setSavingState('saving');
      setErrorMessage('');
      const payload = {
        title: nextSnapshot.title,
        content_md: nextSnapshot.content,
        status: nextSnapshot.status,
        themeId: nextSnapshot.themeId || null
      };

      try {
        let response;
        if (postId) {
          response = await fetch(`/api/posts/${postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        const { post } = await response.json();
        setPostId(post.id);
        setSlug(post.slug);
        setTitle(post.title);
        setContent(post.content_md);
        setStatus(post.status);
        setThemeId(post.themeId ?? '');
        lastSavedRef.current = {
          title: post.title,
          content: post.content_md,
          status: post.status,
          themeId: post.themeId ?? ''
        };
        setSavingState('saved');
        // Update URL when switching between write/edit to keep location stable
        if (!initialPost && postId === null) {
          router.replace(`/edit/${post.id}`);
        }
      } catch (error) {
        console.error(error);
        setSavingState('error');
        setErrorMessage('Autosave failed. Check your connection and retry.');
      }
    },
    [initialPost, postId, router]
  );

  useEffect(() => {
    if (!dirty) {
      if (savingState === 'saving') {
        setSavingState('saved');
      }
      return;
    }
    setSavingState('pending');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persist(snapshot);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dirty, persist, snapshot, savingState]);

  useEffect(() => {
    const handler = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const toggleStatus = () => {
    setStatus((prev) => (prev === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'));
  };

  const statusLabel = useMemo(() => {
    switch (savingState) {
      case 'saving':
        return 'Saving…';
      case 'pending':
        return 'Pending save…';
      case 'saved':
        return 'Saved';
      case 'error':
        return errorMessage || 'Error saving';
      default:
        return dirty ? 'Unsaved changes' : 'Idle';
    }
  }, [dirty, errorMessage, savingState]);

  return (
    <div className="editor-shell" data-status={status.toLowerCase()}>
      <section className="editor-panel" aria-label="Compose entry">
        <label>
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled entry"
            maxLength={200}
          />
        </label>

        <label>
          <span>Theme override</span>
          <select value={themeId} onChange={(event) => setThemeId(event.target.value)}>
            <option value="">Use site default</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={status === 'PUBLISHED'}
              onChange={toggleStatus}
            />
            <span>Publish</span>
          </label>
          <span className="badge">{status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>
          <span className="status-indicator" role="status" aria-live="polite">
            {statusLabel}
          </span>
        </div>

        {status === 'PUBLISHED' && slug ? (
          <p className="status-indicator">
            Live at <Link href={`/p/${slug}`}>/p/{slug}</Link>
          </p>
        ) : null}

        {errorMessage ? <p className="status-indicator" style={{ color: 'var(--accent)' }}>{errorMessage}</p> : null}

        <label>
          <span>Markdown</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Start writing in Markdown…"
          />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" onClick={() => setShowPreview((prev) => !prev)}>
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          {status === 'PUBLISHED' && slug ? (
            <Link href={`/p/${slug}`} className="link-button">
              View post
            </Link>
          ) : null}
        </div>
      </section>

      {showPreview && (
        <section className="editor-panel" aria-label="Live preview">
          <h2 style={{ margin: 0 }}>Preview</h2>
          <PreviewPane markdown={content} />
        </section>
      )}
    </div>
  );
}
