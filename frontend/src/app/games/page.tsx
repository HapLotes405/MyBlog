import Link from 'next/link';
import styles from './page.module.css';

const GAMES = [
  {
    id: 'janus-labyrinth',
    title: '雅努斯迷津',
    subtitle: 'Janus Labyrinth',
    description: '基于物理的2D益智游戏，旋转迷宫引导石球穿越障碍抵达终点。7个难度递增的关卡等你挑战。',
    icon: '🏛️',
    difficulty: '中等',
    tag: '物理益智',
  },
];

export default function GamesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Games</h1>
        <p className={styles.desc}>带排名的小游戏，放松一下</p>
      </div>

      <div className={styles.grid}>
        {GAMES.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className={styles.card}
          >
            <div className={styles.cardIcon}>{game.icon}</div>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{game.title}</h2>
                <span className={styles.cardTag}>{game.tag}</span>
              </div>
              <p className={styles.cardSubtitle}>{game.subtitle}</p>
              <p className={styles.cardDesc}>{game.description}</p>
              <div className={styles.cardFooter}>
                <span className={styles.cardDifficulty}>
                  难度: {game.difficulty}
                </span>
                <span className={styles.cardAction}>开始游戏 →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
