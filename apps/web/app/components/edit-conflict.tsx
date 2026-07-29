import styles from "../styles/app.module.css";

interface EditConflictProps {
  onReload: () => void;
}

export function EditConflict({ onReload }: EditConflictProps) {
  return (
    <div aria-live="polite" className={styles.conflictNotice} role="status">
      <p>
        These details changed somewhere else while this form was open. Load the
        latest version before saving.
      </p>
      <button className={styles.textButton} onClick={onReload} type="button">
        Load latest
      </button>
    </div>
  );
}
