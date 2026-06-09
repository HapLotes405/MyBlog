'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { blogApi } from '@/services/api';
import { BlogPost } from '@/types';
import BlogEditor from '@/components/blog/editor/BlogEditor';

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    blogApi.getBySlug(slug).then((res) => {
      if (res.success && res.data) {
        setPost(res.data as BlogPost);
      } else {
        setNotFound(true);
      }
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>文章未找到</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          你要编辑的文章不存在。
        </p>
        <Link href="/" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>← 返回首页</Link>
      </div>
    );
  }

  return <BlogEditor post={post} isNew={false} />;
}
