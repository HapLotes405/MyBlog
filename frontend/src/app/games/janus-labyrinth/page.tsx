'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { gameApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { LeaderboardEntry } from '@/types';
import styles from './page.module.css';

// ================================================================
// Level metadata
// ================================================================
interface LevelInfo {
  id: number;
  name: string;
  nameEn: string;
  difficulty: string;
  unlocked: boolean;
}

const LEVELS: LevelInfo[] = [
  { id: 1, name: '初始之旋', nameEn: 'First Rotation', difficulty: '简单', unlocked: true },
  { id: 2, name: '双生之径', nameEn: 'Twin Paths', difficulty: '简单', unlocked: true },
  { id: 3, name: '三重门', nameEn: 'Triple Gate', difficulty: '中等', unlocked: true },
  { id: 4, name: '深渊之眼', nameEn: 'Abyss Eye', difficulty: '中等', unlocked: true },
  { id: 5, name: '镜中世界', nameEn: 'Mirror World', difficulty: '困难', unlocked: true },
  { id: 6, name: '星辰迷阵', nameEn: 'Star Maze', difficulty: '困难', unlocked: true },
  { id: 7, name: '时空裂隙', nameEn: 'Time Rift', difficulty: '极难', unlocked: true },
  { id: 8, name: '终极试炼', nameEn: 'Final Trial', difficulty: '极难', unlocked: true },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  '简单': '#22c55e',
  '中等': '#f59e0b',
  '困难': '#f97316',
  '极难': '#ef4444',
};

// ================================================================
// Time formatter
// ================================================================
function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenth = Math.floor((ms % 1000) / 100);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${tenth}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

// ================================================================
// Game Page Component
// ================================================================
export default function JanusLabyrinthPage() {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // State
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [displayTimeMs, setDisplayTimeMs] = useState(0);
  const [finalTimeMs, setFinalTimeMs] = useState<number | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [leaderboardLevel, setLeaderboardLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ================================================================
  // Level Selection
  // ================================================================
  const handleSelectLevel = (levelId: number) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level || !level.unlocked) return;
    setSelectedLevel(levelId);
    setGameStarted(false);
    setDisplayTimeMs(0);
    setFinalTimeMs(null);
    setScoreSubmitted(false);
    setSubmitError('');
  };

  const handleBackToLevels = () => {
    setSelectedLevel(null);
    setGameStarted(false);
    stopTimer();
    setDisplayTimeMs(0);
    setFinalTimeMs(null);
    setScoreSubmitted(false);
    setSubmitError('');
  };

  // ================================================================
  // Timer
  // ================================================================
  const startTimer = useCallback(() => {
    const startTick = Date.now();
    timerRef.current = setInterval(() => {
      setDisplayTimeMs(Date.now() - startTick);
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { stopTimer(); };
  }, [stopTimer]);

  // ================================================================
  // postMessage handler
  // ================================================================
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'GAME_READY':
          // Game loaded and ready — no need to send LOAD_LEVEL back
          // (game reads ?level=N from its own URL at startup)
          break;

        case 'GAME_STARTED':
          setGameStarted(true);
          setDisplayTimeMs(0);
          startTimer();
          break;

        case 'GAME_WIN':
          stopTimer();
          setFinalTimeMs(msg.data.timeMs);
          setDisplayTimeMs(msg.data.timeMs);
          setScoreSubmitted(false);
          setSubmitError('');
          // Refresh leaderboard for this level
          fetchLeaderboard(msg.data.level || selectedLevel || 1);
          break;

        case 'GAME_RESET':
          setGameStarted(false);
          setDisplayTimeMs(0);
          setFinalTimeMs(null);
          setScoreSubmitted(false);
          startTimer();
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectedLevel, startTimer, stopTimer]);

  // ================================================================
  // Leaderboard
  // ================================================================
  const fetchLeaderboard = useCallback(async (level: number) => {
    setLbLoading(true);
    try {
      const res = await gameApi.getLeaderboard(level);
      if (res.success) {
        setLeaderboard(res.data);
      }
    } catch { /* ignore */ }
    setLbLoading(false);
  }, []);

  // Load leaderboard on mount and when level changes
  useEffect(() => {
    fetchLeaderboard(leaderboardLevel);
  }, [leaderboardLevel, fetchLeaderboard]);

  // ================================================================
  // Score submission
  // ================================================================
  const handleSubmitScore = async () => {
    if (finalTimeMs === null || !selectedLevel) return;
    setSubmitError('');
    try {
      await gameApi.submitScore(selectedLevel, finalTimeMs);
      setScoreSubmitted(true);
      fetchLeaderboard(selectedLevel);
    } catch {
      setSubmitError('提交失败，请稍后重试');
    }
  };

  // ================================================================
  // Render: Level Selection
  // ================================================================
  if (!selectedLevel) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href="/games" className={styles.backLink}>← 返回游戏列表</Link>
          <h1 className={styles.title}>雅努斯迷津</h1>
          <p className={styles.desc}>通过旋转迷宫，引导石球穿过层层障碍，抵达底部平台</p>
          <div className={styles.controls}>
            <span><kbd>Space</kbd> / <kbd>长按屏幕</kbd> 顺时针旋转</span>
            <span><kbd>R</kbd> 重置</span>
          </div>
        </div>

        <section className={styles.levelSection}>
          <h2 className={styles.levelSectionTitle}>选择关卡</h2>
          <div className={styles.levelGrid}>
            {LEVELS.map((level) => (
              <button
                key={level.id}
                className={`${styles.levelCard} ${!level.unlocked ? styles.levelCardLocked : ''}`}
                onClick={() => handleSelectLevel(level.id)}
                disabled={!level.unlocked}
                title={!level.unlocked ? '即将开放' : `第 ${level.id} 关：${level.name}`}
              >
                <span className={styles.levelNumber}>
                  {level.unlocked ? String(level.id).padStart(2, '0') : '🔒'}
                </span>
                <div className={styles.levelInfo}>
                  <span className={styles.levelName}>{level.name}</span>
                  <span className={styles.levelNameEn}>{level.nameEn}</span>
                  <span
                    className={styles.levelDifficulty}
                    style={{ color: DIFFICULTY_COLORS[level.difficulty] || '#94a3b8' }}
                  >
                    {level.difficulty}
                  </span>
                </div>
                {!level.unlocked && <span className={styles.lockOverlay}>即将开放</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Leaderboard on level select page too */}
        <LeaderboardPanel
          level={leaderboardLevel}
          setLevel={setLeaderboardLevel}
          leaderboard={leaderboard}
          loading={lbLoading}
        />
      </div>
    );
  }

  // ================================================================
  // Render: Game Mode
  // ================================================================
  const currentLevel = LEVELS.find(l => l.id === selectedLevel);

  return (
    <div className={styles.page}>
      {/* Game toolbar */}
      <div className={styles.gameBar}>
        <button className={styles.backBtn} onClick={handleBackToLevels}>
          ← 选关
        </button>
        <div className={styles.levelLabel}>
          {currentLevel?.name} <span className={styles.levelDiffLabel} style={{ color: DIFFICULTY_COLORS[currentLevel?.difficulty || '简单'] }}>{currentLevel?.difficulty}</span>
        </div>
        <div className={`${styles.timer} ${finalTimeMs !== null ? styles.timerFinal : ''}`}>
          {formatTimeMs(displayTimeMs)}
        </div>
      </div>

      {/* Game iframe */}
      <div className={styles.gameWrapper}>
        {!gameStarted && finalTimeMs === null && (
          <div className={styles.gameOverlay}>
            <span className={styles.overlayHint}>
              {selectedLevel && LEVELS.find(l => l.id === selectedLevel)?.unlocked
                ? '准备中...'
                : '加载中...'}
            </span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className={styles.gameIframe}
          src={`/games/janus-labyrinth/level${selectedLevel}.html`}
          title="Janus Labyrinth Game"
          allow="accelerometer; autoplay"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Win state — score submission */}
      {finalTimeMs !== null && (
        <div className={styles.winBar}>
          <span className={styles.winText}>
            🏆 {formatTimeMs(finalTimeMs)}
          </span>
          {user ? (
            scoreSubmitted ? (
              <span className={styles.submittedBadge}>✅ 已记录</span>
            ) : (
              <button className={styles.submitBtn} onClick={handleSubmitScore}>
                提交成绩
              </button>
            )
          ) : (
            <Link href="/login" className={styles.loginHint}>
              登录后可提交成绩
            </Link>
          )}
          {submitError && <span className={styles.submitError}>{submitError}</span>}
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardPanel
        level={leaderboardLevel}
        setLevel={setLeaderboardLevel}
        leaderboard={leaderboard}
        loading={lbLoading}
      />
    </div>
  );
}

// ================================================================
// Leaderboard sub-component
// ================================================================
function LeaderboardPanel({
  level,
  setLevel,
  leaderboard,
  loading,
}: {
  level: number;
  setLevel: (l: number) => void;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
}) {
  return (
    <section className={styles.leaderboardSection}>
      <div className={styles.lbHeader}>
        <h3 className={styles.lbTitle}>🏅 排行榜</h3>
      </div>

      {/* Level tabs */}
      <div className={styles.lbTabs}>
        {LEVELS.map((l) => (
          <button
            key={l.id}
            className={`${styles.lbTab} ${l.id === level ? styles.lbTabActive : ''}`}
            onClick={() => setLevel(l.id)}
            title={l.name}
          >
            {l.id}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.lbTable}>
        <div className={styles.lbRow + ' ' + styles.lbRowHeader}>
          <span className={styles.lbRank}>#</span>
          <span className={styles.lbPlayer}>玩家</span>
          <span className={styles.lbTime}>时间</span>
          <span className={styles.lbDate}>日期</span>
        </div>

        {loading && <p className={styles.lbStatus}>加载中...</p>}
        {!loading && leaderboard.length === 0 && (
          <p className={styles.lbStatus}>暂无记录，快来成为第一名！</p>
        )}

        {leaderboard.map((entry) => (
          <div key={entry.userId + '_' + entry.rank} className={styles.lbRow}>
            <span className={`${styles.lbRank} ${entry.rank <= 3 ? styles['lbRankTop' + entry.rank] : ''}`}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
            </span>
            <span className={styles.lbPlayer}>
              <span className={styles.lbAvatar}>
                {entry.avatar
                  ? entry.avatar
                  : (entry.nickname || entry.username).charAt(0).toUpperCase()}
              </span>
              {entry.nickname || entry.username}
            </span>
            <span className={styles.lbTime}>{formatTimeMs(entry.timeMs)}</span>
            <span className={styles.lbDate}>{formatDate(entry.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
