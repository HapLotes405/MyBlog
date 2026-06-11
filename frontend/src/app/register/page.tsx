'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registerError, setRegisterError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!username.trim()) newErrors.username = '请输入用户名';
    if (email && !/\S+@\S+\.\S+/.test(email)) newErrors.email = '邮箱格式不正确';
    if (!password) newErrors.password = '请输入密码';
    else if (password.length < 6) newErrors.password = '密码至少 6 位';
    if (password !== confirmPassword) newErrors.confirmPassword = '两次密码不一致';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setRegisterError('');
    const success = await register(username.trim(), email.trim() || '', password);
    if (success) {
      router.push('/');
    } else {
      setRegisterError('注册失败，用户名可能已被使用');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>注册</h1>
        <p className={styles.subtitle}>创建你的博客账号，开始互动</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="username">用户名 *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="你的用户名"
            />
            {errors.username && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.username}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email">邮箱（可选）</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com（选填）"
            />
            {errors.email && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">密码 *</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
            {errors.password && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.password}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">确认密码 *</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
            />
            {errors.confirmPassword && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.confirmPassword}</span>}
          </div>

          {registerError && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{registerError}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className={styles.footer}>
          已有账号？<Link href="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
