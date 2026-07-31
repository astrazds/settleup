import { lazy, Suspense, useRef, useState } from "react";

import { TrashIcon } from "./icons";
import styles from "../styles/app.module.css";

const loadDeleteConfirmDialog = () => import("./delete-confirm-dialog");
const DeleteConfirmDialog = lazy(loadDeleteConfirmDialog);

interface DeleteConfirmProps {
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  itemLabel: string;
  onConfirm: () => void;
  title: string;
}

export function DeleteConfirm({
  description,
  disabled = false,
  disabledReason,
  itemLabel,
  onConfirm,
  title,
}: DeleteConfirmProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (disabled) {
    const reason = disabledReason ?? "This item cannot be deleted right now.";
    return (
      <button
        aria-disabled="true"
        aria-label={`Cannot delete ${itemLabel}. ${reason}`}
        className={styles.iconButton}
        title={reason}
        type="button"
      >
        <TrashIcon />
        <span aria-hidden="true" className={styles.actionLabel}>
          Delete
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Delete ${itemLabel}`}
        className={styles.iconButton}
        onClick={() => setOpen(true)}
        onFocus={() => void loadDeleteConfirmDialog()}
        onPointerEnter={() => void loadDeleteConfirmDialog()}
        ref={triggerRef}
        title={`Delete ${itemLabel}`}
        type="button"
      >
        <TrashIcon />
        <span aria-hidden="true" className={styles.actionLabel}>
          Delete
        </span>
      </button>
      {open ? (
        <Suspense fallback={null}>
          <DeleteConfirmDialog
            description={description}
            onConfirm={onConfirm}
            onOpenChange={setOpen}
            open={open}
            returnFocus={triggerRef}
            title={title}
          />
        </Suspense>
      ) : null}
    </>
  );
}
