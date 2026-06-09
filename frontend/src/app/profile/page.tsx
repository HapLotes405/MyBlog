'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/services/api';
import styles from './page.module.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user?.nickname || user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>请先登录</h1>
          <p className={styles.desc}>你需要登录后才能编辑个人信息。</p>
          <button className={styles.btn} onClick={() => router.push('/login')}>
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // Limit to 2 MB for database storage
    if (file.size > 2 * 1024 * 1024) {
      setError('图片不能超过 2 MB');
      return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      setUploading(false);
    };
    reader.onerror = () => {
      setError('图片读取失败');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await userApi.updateProfile({ nickname, avatar });
      if (res.success && res.data) {
        updateUser(res.data);
        setMessage('个人信息已更新');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>个人信息</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Avatar */}
          <div className={styles.field}>
            <label className={styles.label}>头像</label>
            <div className={styles.avatarRow}>
              <div className={styles.avatarWrap} onClick={handleAvatarClick}>
                <img
                  className={styles.avatar}
                  src={avatar || '/default-avatar.svg'}
                  alt="avatar"
                />
                {uploading ? (
                  <div className={styles.avatarOverlay}>上传中...</div>
                ) : (
                  <div className={styles.avatarOverlay}>更换</div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleFileChange}
              />
              <p className={styles.hint}>点击头像上传新图片</p>
            </div>
          </div>

          {/* Nickname */}
          <div className={styles.field}>
            <label htmlFor="nickname" className={styles.label}>昵称</label>
            <input
              id="nickname"
              type="text"
              className={styles.input}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
            />
          </div>

          {/* Readonly info */}
          <div className={styles.field}>
            <label className={styles.label}>用户名</label>
            <input
              type="text"
              className={`${styles.input} ${styles.inputDisabled}`}
              value={user.username}
              disabled
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}

          <button type="submit" className={styles.btn} disabled={saving || uploading}>
            {saving ? '保存中...' : '保存修改'}
          </button>
        </form>
      </div>
    </div>
  );
}
