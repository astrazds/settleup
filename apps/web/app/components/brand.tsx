import { Link } from "react-router";

import { LogoIcon } from "./icons";
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
      <span className={styles.mark}>
        <LogoIcon />
      </span>
      <span className={styles.wordmark}>SettleUp</span>
    </Link>
  );
}
