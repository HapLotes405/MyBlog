import { Suspense } from 'react';
import BlogContent from './BlogContent';
import styles from './page.module.css';

export default function BlogPage() {
  return (
    <Suspense fallback={
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>博客</h1>
          <p className={styles.pageDesc}>加载中...</p>
        </div>
      </div>
    }>
      <BlogContent />
    </Suspense>
  );
}
