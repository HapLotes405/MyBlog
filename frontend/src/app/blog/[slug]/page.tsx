'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { blogApi, interactionApi } from '@/services/api';
import { BlogPost } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { renderMarkdown } from '@/utils/markdown';
import CommentSection from '@/components/blog/CommentSection';
import styles from './page.module.css';

// Session-based view tracking: only count a view once per slug per session
const VIEWED_KEY = 'viewed_posts';
function hasViewed(slug: string): boolean {
  try {
    const viewed: string[] = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || '[]');
    return viewed.includes(slug);
  } catch { return false; }
}
function markViewed(slug: string): void {
  try {
    const viewed: string[] = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || '[]');
    if (!viewed.includes(slug)) {
      viewed.push(slug);
      sessionStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
    }
  } catch { /* ignore */ }
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isBlogger } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Smart back: use browser history, fall back to /blog
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/blog');
    }
  };

  useEffect(() => {
    if (!slug) { setLoading(false); return; }

    // If this is the first view in this session, hit the count endpoint
    if (!hasViewed(slug)) {
      // Call getBySlug which increments view count on the backend
      blogApi.getBySlug(slug).then((res) => {
        if (res.success && res.data) {
          const p = res.data as BlogPost;
          setPost(p);
          setLikeCount(p.likes);
          setFavCount(p.favorites);
          markViewed(slug);
        } else {
          setNotFound(true);
        }
      }).catch(() => setNotFound(true)).finally(() => setLoading(false));
    } else {
      // Already viewed this session: fetch without incrementing view count
      blogApi.getBySlug(slug, false).then((res) => {
        if (res.success && res.data) {
          const p = res.data as BlogPost;
          setPost(p);
          setLikeCount(p.likes);
          setFavCount(p.favorites);
        } else {
          setNotFound(true);
        }
      }).catch(() => setNotFound(true)).finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', padding: '4rem' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className={styles.notFound}>
        <h2>文章未找到</h2>
        <p>你查找的文章 &quot;{slug}&quot; 不存在或已被移除。</p>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push('/blog'); }}>← 返回博客列表</a>
      </div>
    );
  }

  const handleLike = async () => {
    if (!user) { alert('请先登录后再点赞'); return; }
    try {
      const res = await interactionApi.like(post.slug);
      if (res.success && res.data) {
        setLiked(res.data.liked);
        setLikeCount((c) => (res.data.liked ? c + 1 : c - 1));
      }
    } catch { /* ignore */ }
  };

  const handleFavorite = async () => {
    if (!user) { alert('请先登录后再收藏'); return; }
    try {
      const res = await interactionApi.favorite(post.slug);
      if (res.success && res.data) {
        setFavorited(res.data.favorited);
        setFavCount((c) => (res.data.favorited ? c + 1 : c - 1));
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;
    setDeleteLoading(true);
    try {
      await blogApi.delete(post.id);
      router.push('/');
    } catch {
      alert('删除失败，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  const contentHtml = renderMarkdown(post.content);

  return (
    <div className={styles.page}>
      <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); handleBack(); }}>← 返回</a>

      <article className={styles.article}>
        <div className={styles.tags}>
          {post.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>

        <h1 className={styles.title}>{post.title}</h1>

        {isBlogger && (
          <div className={styles.bloggerActions}>
            <Link href={`/blog/${post.slug}/edit`} className={styles.editBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              编辑
            </Link>
            <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleteLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {deleteLoading ? '删除中...' : '删除'}
            </button>
          </div>
        )}

        <div className={styles.meta}>
          <span>{post.author.username}</span>
          <span>{post.createdAt}</span>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {post.readingTime} 分钟阅读
          </span>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            {post.views} 阅读
          </span>
        </div>

        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className={styles.coverImage} />
        )}

        <div className={styles.interactions}>
          <button className={`${styles.interactBtn} ${liked ? styles.interactBtnActive : ''}`} onClick={handleLike}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            赞 {likeCount}
          </button>
          <button className={`${styles.interactBtn} ${favorited ? styles.interactBtnActive : ''}`} onClick={handleFavorite}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            收藏 {favCount}
          </button>
        </div>

        <div
          className={`${styles.content} md-content`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      <CommentSection postSlug={post.slug} />
    </div>
  );
}
