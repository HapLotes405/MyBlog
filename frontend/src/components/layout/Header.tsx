'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客' },
  { href: '/games', label: 'Games' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isBlogger, user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const displayName = user ? (user.nickname || user.username) : '登录';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            {"HapLotes405's Wiki"}
          </Link>

          <nav className={styles.nav}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            {isBlogger && (
              <Link href="/blog/new" className={styles.writeBtn}>
                写文章
              </Link>
            )}
            <Link href={user ? '/profile' : '/login'} className={styles.userArea}>
              <img
                className={styles.avatar}
                src={user?.avatar || '/default-avatar.svg'}
                alt="avatar"
              />
              <span className={styles.userName}>{displayName}</span>
            </Link>
            {user && (
              <button className={styles.loginBtn} onClick={logout}>
                退出
              </button>
            )}
          </div>

          {/* 移动端可见的退出按钮 */}
          {user && (
            <button className={styles.mobileLogoutBtn} onClick={logout} title="退出登录">
              退出
            </button>
          )}
          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* 移动端导航 — 渲染在 header 外部，避免 backdrop-filter 创建的新包含块导致 fixed 定位失效 */}
      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ''}`}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        {user ? (
          <>
            <Link
              href="/profile"
              className={styles.mobileNavLink}
              onClick={() => setMobileOpen(false)}
            >
              个人信息
            </Link>
            {isBlogger && (
              <Link
                href="/blog/new"
                className={styles.mobileNavLink}
                onClick={() => setMobileOpen(false)}
              >
                写文章
              </Link>
            )}
            <button
              className={styles.mobileNavLink}
              onClick={() => { logout(); setMobileOpen(false); }}
              style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
            >
              退出登录
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className={styles.mobileNavLink}
            onClick={() => setMobileOpen(false)}
          >
            登录
          </Link>
        )}
      </div>
    </>
  );
}
