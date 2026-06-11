'use client';

import { Component, ReactNode } from 'react';

// ---- Error Boundary for dangerouslySetInnerHTML ----
// Catches DOM rendering crashes and shows fallback content instead of a white page

interface SafeHTMLBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SafeHTMLBoundaryState {
  hasError: boolean;
}

class SafeHTMLBoundary extends Component<SafeHTMLBoundaryProps, SafeHTMLBoundaryState> {
  constructor(props: SafeHTMLBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SafeHTMLBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[SafeHTML] Render error caught by boundary:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '1rem',
          border: '1px solid var(--color-border, #e5e5e5)',
          borderRadius: '8px',
          color: 'var(--color-text-secondary, #666)',
          fontSize: '0.9rem',
        }}>
          ⚠️ 内容渲染异常，请检查 Markdown 语法。
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Safe HTML Renderer ----
// Use instead of raw dangerouslySetInnerHTML to prevent page crashes

type HtmlTag = 'div' | 'span' | 'section' | 'article' | 'p' | 'pre';

interface SafeHTMLProps {
  html: string;
  className?: string;
  as?: HtmlTag;
}

export default function SafeHTML({ html, className, as: Tag = 'div' }: SafeHTMLProps) {
  return (
    <SafeHTMLBoundary>
      <Tag
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </SafeHTMLBoundary>
  );
}

export { SafeHTMLBoundary };
