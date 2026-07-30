import type { ReactNode } from "react";

import styles from "../styles/app.module.css";

interface EmptyStateProps {
  action?: ReactNode;
  icon: ReactNode;
  text: string;
  title: string;
}

export function EmptyState({ action, icon, text, title }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyText}>{text}</p>
      {action}
    </div>
  );
}
