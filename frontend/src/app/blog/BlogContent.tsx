'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { blogApi } from '@/services/api';
import { BlogPost } from '@/types';
import BlogCard from '@/components/blog/BlogCard';
import SearchBar from '@/components/blog/SearchBar';
import styles from './page.module.css';

export default function BlogContent() {
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    // Fetch all posts (up to 100)
    blogApi.list(1, undefined, 100).then((res) => {
      if (res.success) setAllPosts(res.data as BlogPost[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags))).sort();

  const filteredPosts = useMemo(() => {
    let results = allPosts;
    if (activeTag) {
      results = results.filter((p) => p.tags.includes(activeTag));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter((post) => {
        const searchText = [post.title, post.summary, post.content, ...post.tags].join(' ').toLowerCase();
        return searchText.includes(q);
      });
    }
    return results;
  }, [activeTag, query, allPosts]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>博客</h1>
          <p className={styles.pageDesc}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>博客</h1>
        <p className={styles.pageDesc}>
          技术分享与思考，涵盖前端开发、后端架构和工程实践。
        </p>
        <div className={styles.searchWrapper}>
          <SearchBar posts={allPosts} placeholder="搜索文章..." initialQuery={searchQuery} />
        </div>
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterTag} ${activeTag === null ? styles.filterTagActive : ''}`}
            onClick={() => setActiveTag(null)}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.filterTag} ${activeTag === tag ? styles.filterTagActive : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filteredPosts.length > 0 ? (
        <div className={styles.postsGrid}>
          {filteredPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>暂无相关文章</p>
      )}
    </div>
  );
}
