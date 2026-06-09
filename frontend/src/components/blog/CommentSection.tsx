'use client';

import { useState, useEffect } from 'react';
import { Comment } from '@/types';
import { commentApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  postSlug: string;
}

export default function CommentSection({ postSlug }: CommentSectionProps) {
  const { user, isBlogger } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadComments = () => {
    setLoading(true);
    commentApi.list(postSlug).then((res) => {
      if (res.success && res.data) {
        setComments(res.data as Comment[]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();
  }, [postSlug]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      await commentApi.create(postSlug, newComment.trim());
      setNewComment('');
      loadComments();
    } catch {
      setError('评论发送失败，请重试');
    } finally { setSubmitting(false); }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      await commentApi.create(postSlug, replyContent.trim(), parentId);
      setReplyTo(null);
      setReplyContent('');
      loadComments();
    } catch {
      setError('回复发送失败，请重试');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await commentApi.delete(commentId);
      loadComments();
    } catch {
      setError('删除失败，请重试');
    }
  };

  const totalCount = comments.length + comments.reduce((s, c) => s + (c.replies?.length || 0), 0);

  const canDelete = (authorId: string): boolean => {
    if (!user) return false;
    return isBlogger || user.id === authorId;
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <h3 className={styles.title}>评论 (加载中...)</h3>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>评论 ({totalCount})</h3>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {user ? (
        <div className={styles.inputBox}>
          <div className={styles.inputAvatar}>
            {user.username.charAt(0)}
          </div>
          <div className={styles.inputRight}>
            <textarea
              className={styles.textarea}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              rows={3}
            />
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? '发送中...' : '发表评论'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.loginHint}>
          请<a href="/login">登录</a>后发表评论
        </div>
      )}

      <div className={styles.list}>
        {comments.filter((c) => !c.parentId).length === 0 ? (
          <p className={styles.empty}>暂无评论，来发表第一条评论吧</p>
        ) : (
          comments.filter((c) => !c.parentId).map((comment) => {
            const cName = comment.author?.username || '匿名';
            const cRole = comment.author?.role || 'user';
            const cAuthorId = comment.author?.id || '0';
            return (
            <div key={comment.id} className={styles.comment}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAvatar}>
                  {cName.charAt(0)}
                </span>
                <div className={styles.commentAuthorInfo}>
                  <span className={styles.commentAuthor}>
                    {cName}
                    {cRole === 'blogger' && (
                      <span className={styles.bloggerBadge}>博主</span>
                    )}
                  </span>
                  <span className={styles.commentDate}>{comment.createdAt}</span>
                </div>
                {canDelete(cAuthorId) && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(comment.id)}
                    title="删除"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
              <p className={styles.commentContent}>{comment.content}</p>
              <div className={styles.commentActions}>
                {user && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  >
                    回复
                  </button>
                )}
              </div>

              {replyTo === comment.id && user && (
                <div className={styles.replyBox}>
                  <textarea
                    className={styles.textarea}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`回复 ${comment.author.username}...`}
                    rows={2}
                  />
                  <div className={styles.replyActions}>
                    <button
                      className={styles.submitBtn}
                      onClick={() => handleReply(comment.id)}
                      disabled={submitting || !replyContent.trim()}
                    >
                      {submitting ? '发送中...' : '回复'}
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => { setReplyTo(null); setReplyContent(''); }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div className={styles.replies}>
                  {comment.replies.map((reply) => {
                    const name = reply.author?.username || '匿名';
                    const role = reply.author?.role || 'user';
                    const authorId = reply.author?.id || '0';
                    return (
                    <div key={reply.id} className={styles.replyItem}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAvatar}>
                          {name.charAt(0)}
                        </span>
                        <div className={styles.commentAuthorInfo}>
                          <span className={styles.commentAuthor}>
                            {name}
                            {role === 'blogger' && (
                              <span className={styles.bloggerBadge}>博主</span>
                            )}
                          </span>
                          <span className={styles.commentDate}>{reply.createdAt}</span>
                        </div>
                        {canDelete(authorId) && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(reply.id)}
                            title="删除"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className={styles.commentContent}>{reply.content}</p>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )})
        )}
      </div>
    </section>
  );
}
