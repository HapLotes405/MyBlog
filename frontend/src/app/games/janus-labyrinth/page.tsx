import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: '雅努斯迷津 — Janus Labyrinth',
  description: '通过旋转迷宫，引导石球到达终点',
};

export default function JanusLabyrinthPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/games" className={styles.backLink}>
          ← 返回游戏列表
        </Link>
        <h1 className={styles.title}>雅努斯迷津</h1>
        <p className={styles.desc}>
          通过旋转迷宫，引导石球穿过层层障碍，抵达底部平台
        </p>
        <div className={styles.controls}>
          <span><kbd>Space</kbd> / <kbd>长按屏幕</kbd> 顺时针旋转</span>
          <span><kbd>R</kbd> 重置</span>
        </div>
      </div>

      <div className={styles.gameWrapper}>
        <iframe
          className={styles.gameIframe}
          src="/games/janus-labyrinth/index.html"
          title="Janus Labyrinth Game"
          allow="accelerometer; autoplay"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
