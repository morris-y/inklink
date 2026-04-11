'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  padding: 2rem;
  max-width: 600px;
`;

const SectionTitle = styled.h3`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #888880;
  margin-bottom: 1rem;
`;

const DropZone = styled.div<{ $dragging: boolean; $hasImage: boolean }>`
  position: relative;
  border: 2px dashed ${p => p.$dragging ? '#1a1a18' : 'rgba(26,26,24,0.15)'};
  border-radius: 8px;
  padding: ${p => p.$hasImage ? '0' : '3rem 2rem'};
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  overflow: hidden;

  &:hover {
    border-color: rgba(26,26,24,0.3);
    background: rgba(26,26,24,0.02);
  }
`;

const DropLabel = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  color: #3a3a36;
  margin-bottom: 0.25rem;
`;

const DropHint = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  color: #888880;
`;

const Preview = styled.div`
  position: relative;
  width: 100%;

  img, video {
    width: 100%;
    max-height: 300px;
    object-fit: contain;
    display: block;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.35rem 0.75rem;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0,0,0,0.8);
  }
`;

const StatusText = styled.p<{ $error?: boolean }>`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.78rem;
  color: ${p => p.$error ? '#c44' : '#888880'};
  margin-top: 0.75rem;
`;

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src);
}

export default function SettingsView() {
  const [coverImage, setCoverImage] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/dashboard/cover-image')
      .then(r => r.json())
      .then(data => setCoverImage(data.coverImage || ''))
      .catch(() => {});
  }, []);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setStatus(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/dashboard/cover-image', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        setCoverImage(data.coverImage + '?t=' + Date.now());
        setStatus({ text: 'Cover image updated', error: false });
      } else {
        setStatus({ text: data.error || 'Upload failed', error: true });
      }
    } catch {
      setStatus({ text: 'Upload failed', error: true });
    }
    setUploading(false);
  }, []);

  const remove = useCallback(async () => {
    setStatus(null);
    try {
      const res = await fetch('/api/dashboard/cover-image', { method: 'DELETE' });
      if (res.ok) {
        setCoverImage('');
        setStatus({ text: 'Cover image removed', error: false });
      }
    } catch {
      setStatus({ text: 'Failed to remove', error: true });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const hasCover = coverImage.length > 0;
  const cleanSrc = coverImage.split('?')[0];

  return (
    <Wrap>
      <SectionTitle>Cover Image / Video</SectionTitle>
      <DropZone
        $dragging={dragging}
        $hasImage={hasCover}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !hasCover && inputRef.current?.click()}
      >
        {hasCover ? (
          <Preview>
            {isVideo(cleanSrc) ? (
              <video src={coverImage} autoPlay muted loop playsInline />
            ) : (
              <img src={coverImage} alt="Cover" />
            )}
            <RemoveButton onClick={e => { e.stopPropagation(); remove(); }}>Remove</RemoveButton>
          </Preview>
        ) : (
          <>
            <DropLabel>{uploading ? 'Uploading...' : 'Drop an image or video here'}</DropLabel>
            <DropHint>JPG, PNG, WebP, GIF, MP4, WebM</DropHint>
          </>
        )}
      </DropZone>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {status && <StatusText $error={status.error}>{status.text}</StatusText>}
    </Wrap>
  );
}
