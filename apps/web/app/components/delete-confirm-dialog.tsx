import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { RefObject } from "react";

import styles from "../styles/app.module.css";

interface DeleteConfirmDialogProps {
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocus: RefObject<HTMLButtonElement | null>;
  title: string;
}

export default function DeleteConfirmDialog({
  description,
  onConfirm,
  onOpenChange,
  open,
  returnFocus,
  title,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.dialogOverlay} />
        <AlertDialog.Content
          className={styles.alertContent}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => returnFocus.current?.focus());
          }}
        >
          <AlertDialog.Title className={styles.dialogTitle}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.dialogDescription}>
            {description}
          </AlertDialog.Description>
          <div className={styles.alertActions}>
            <AlertDialog.Cancel
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Keep it
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={onConfirm}
            >
              Delete
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
