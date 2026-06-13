import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <h3>{"HapLotes405's Wiki"}</h3>
          <p>
            技术笔记与博客。记录学习，分享知识。
          </p>
        </div>
        <div className={styles.column}>
          <h4>导航</h4>
          <Link href="/">首页</Link>
          <Link href="/blog">博客</Link>
          <Link href="/games">Games</Link>
        </div>
        <div className={styles.column}>
          <h4>链接</h4>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
      <div className={styles.bottom}>
        <span className={styles.copyright}>
          &copy; {year} {"HapLotes405's Wiki"}. All rights reserved.
        </span>
        <div className={styles.social}>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
