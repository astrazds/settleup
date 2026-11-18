import { Link } from "react-router";

import styles from "../styles/brand.module.css";

interface BrandProps {
  variant?: "app" | "event" | "landing";
}

export function Brand({ variant = "app" }: BrandProps) {
  return (
    <Link
      aria-label="SettleUp home"
      className={`${styles.brand} ${styles[variant]}`}
      to="/"
    >
      <svg aria-hidden="true" className={styles.mark} viewBox="0 0 32 32">
        <use className={styles.carbonCopy} href="/favicon.svg#carbon-copy" />
        <use className={styles.reversePrint} href="/favicon.svg#reverse-print" />
      </svg>
      <span className={styles.wordmark}>SettleUp</span>
    </Link>
  );
}
