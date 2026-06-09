'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { blogApi } from '@/services/api';
import { BlogPost } from '@/types';
import BlogCard from '@/components/blog/BlogCard';
import SearchBar from '@/components/blog/SearchBar';
import styles from './page.module.css';

export default function Home() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    blogApi.list(1, undefined, 5).then((res) => {
      if (res.success) setPosts(res.data as BlogPost[]);
    }).catch(() => {});
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{"HapLotes405's Wiki"}</h1>
        <p className={styles.heroDesc}>
          技术笔记与博客。记录学习，分享知识。
        </p>
        <div className={styles.searchWrapper}>
          <SearchBar posts={posts} placeholder="搜索文章关键词..." />
        </div>
      </section>

      <section className={styles.postsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>最新文章</h2>
          <Link href="/blog" className={styles.viewAll}>
            查看全部 →
          </Link>
        </div>
        {posts.length > 0 ? (
          <div className={styles.postsGrid}>
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>还没有文章，博主正在努力创作中...</p>
        )}
      </section>
    </>
  );
}
