import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import {
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";

import { CloseIcon, TrashIcon } from "./icons";
import styles from "../styles/app.module.css";

interface RouteDialogProps {
  children: ReactNode;
  closeTo: string;
  description?: string;
  title: string;
}

export function RouteDialog({ children, closeTo, description, title }: RouteDialogProps) {
  const navigate = useNavigate();
  const returnFocus = useRef<HTMLElement | null>(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
      ? document.activeElement
      : null,
  );

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          void navigate(closeTo);
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content
          className={styles.dialogContent}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current;
            if (target?.isConnected) {
              target.focus();
            } else {
              document.getElementById("main-content")?.focus();
            }
          }}
        >
          <div aria-hidden="true" className={styles.dialogHandle} />
          <div className={styles.dialogHeader}>
            <div>
              <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className={styles.dialogDescription}>
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close aria-label="Close" className={styles.iconButton}>
              <CloseIcon />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
      </button>
    );
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        aria-label={`Delete ${itemLabel}`}
        className={styles.iconButton}
        title={`Delete ${itemLabel}`}
      >
        <TrashIcon />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.dialogOverlay} />
        <AlertDialog.Content className={styles.alertContent}>
          <AlertDialog.Title className={styles.dialogTitle}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={styles.dialogDescription}>
            {description}
          </AlertDialog.Description>
          <div className={styles.alertActions}>
            <AlertDialog.Cancel className={`${styles.button} ${styles.buttonSecondary}`}>
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
