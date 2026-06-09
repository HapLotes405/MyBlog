import { PersonalInfo } from '@/types';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  info: PersonalInfo;
}

export default function HeroSection({ info }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.avatar}>
        {info.name.charAt(0)}
      </div>
      <h1 className={styles.name}>{info.name}</h1>
      <p className={styles.title}>{info.title}</p>
      <p className={styles.bio}>{info.bio}</p>
      <p className={styles.location}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {info.location}
      </p>
      <div className={styles.socialLinks}>
        {info.socialLinks.map((link) => (
          <a
            key={link.platform}
            href={link.url}
            className={styles.socialLink}
            target="_blank"
            rel="noopener noreferrer"
            title={link.platform}
          >
            {link.platform.charAt(0)}
          </a>
        ))}
      </div>
    </section>
  );
}
