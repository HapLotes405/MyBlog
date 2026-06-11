'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: doLogin } = useAuth();
  const router = useRouter();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!login.trim()) newErrors.login = '请输入用户名或邮箱';
    if (!password) newErrors.password = '请输入密码';
    else if (password.length < 6) newErrors.password = '密码至少 6 位';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setLoginError('');
    const success = await doLogin(login.trim(), password);
    if (success) {
      router.push('/');
    } else {
      setLoginError('用户名或密码错误，请重试');
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>登录</h1>
        <p className={styles.subtitle}>欢迎回来，登录你的博客账号</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="login">用户名 / 邮箱</label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="用户名或邮箱"
            />
            {errors.login && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.login}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
            {errors.password && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}>{errors.password}</span>}
          </div>

          {loginError && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{loginError}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className={styles.footer}>
          还没有账号？<Link href="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
