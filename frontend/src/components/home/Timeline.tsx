import { TimelineItem } from '@/types';
import styles from './Timeline.module.css';

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>经历</h2>
      <div className={styles.timeline}>
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div
              className={`${styles.dot} ${item.type === 'education' ? styles.dotSecondary : ''}`}
            />
            <h3 className={styles.itemTitle}>
              {item.title}
              {item.current && <span className={styles.currentBadge}>现在</span>}
            </h3>
            <p className={styles.itemOrg}>{item.organization}</p>
            <p className={styles.itemDesc}>{item.description}</p>
            <span className={styles.itemDate}>
              {item.startDate} — {item.endDate || '至今'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
