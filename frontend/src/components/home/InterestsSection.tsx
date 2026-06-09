import { Interest } from '@/types';
import styles from './InterestsSection.module.css';

interface InterestsSectionProps {
  interests: Interest[];
}

export default function InterestsSection({ interests }: InterestsSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>兴趣爱好</h2>
      <div className={styles.grid}>
        {interests.map((interest) => (
          <div key={interest.id} className={styles.card}>
            <span className={styles.icon}>{interest.icon === 'code' ? '💻' : interest.icon === 'pen' ? '✍️' : interest.icon === 'bike' ? '🚴' : interest.icon === 'camera' ? '📷' : interest.icon === 'book' ? '📚' : '⭐'}</span>
            <h3 className={styles.cardTitle}>{interest.name}</h3>
            <p className={styles.cardDesc}>{interest.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
