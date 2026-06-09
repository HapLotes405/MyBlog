'use client';

import { useState, useRef, useEffect, useMemo, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BlogPost } from '@/types';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  posts?: BlogPost[];
  placeholder?: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} className={styles.highlight}>{part}</span>
      : part
  );
}

export default function SearchBar({ posts = [], placeholder = '搜索文章...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return posts.filter((post) => {
      const searchText = [
        post.title,
        post.summary,
        post.content,
        ...post.tags,
      ].join(' ').toLowerCase();
      return searchText.includes(q);
    }).slice(0, 8);
  }, [query, posts]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        router.push(`/blog/${results[activeIndex].slug}`);
        setOpen(false);
        setQuery('');
      } else if (query.trim()) {
        router.push(`/blog?search=${encodeURIComponent(query.trim())}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputWrapper}>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className={styles.input}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="搜索文章"
        />
        <span className={styles.shortcut}>⌘K</span>
      </div>

      {open && query.trim() && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            {results.length > 0 ? (
              results.map((post, index) => (
                <a
                  key={post.id}
                  className={styles.resultItem}
                  href={`/blog/${post.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/blog/${post.slug}`);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{ background: index === activeIndex ? 'var(--color-bg-secondary)' : undefined }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className={styles.resultTitle}>{highlightMatch(post.title, query)}</div>
                  <div className={styles.resultSummary}>{highlightMatch(post.summary, query)}</div>
                  <div className={styles.resultMeta}>
                    <span>{post.tags.slice(0, 2).join(' · ')}</span>
                    <span>{post.createdAt}</span>
                  </div>
                </a>
              ))
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔍</span>
                <p>未找到包含 &quot;{query}&quot; 的文章</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
