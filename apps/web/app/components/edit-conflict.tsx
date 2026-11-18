import styles from "../styles/app.module.css";

interface EditConflictProps {
  isLoading: boolean;
  onReload: () => void;
}

export function EditConflict({ isLoading, onReload }: EditConflictProps) {
  return (
    <div aria-live="polite" className={styles.conflictNotice} role="status">
      <p>
        These details changed somewhere else while this form was open. Load the
        latest version before saving.
      </p>
      <button className={styles.textButton} disabled={isLoading} onClick={onReload} type="button">
        {isLoading ? "Loading latest…" : "Load latest"}
      </button>
    </div>
  );
}
