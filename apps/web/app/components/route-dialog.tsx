import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { CloseIcon } from "./icons";
import styles from "../styles/app.module.css";

interface RouteDialogProps {
  children: ReactNode;
  closeTo: string;
  description?: string;
  title: string;
}

export function RouteDialog({
  children,
  closeTo,
  description,
  title,
}: RouteDialogProps) {
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
            requestAnimationFrame(() => {
              if (target?.isConnected) {
                target.focus();
              } else {
                document.getElementById("main-content")?.focus();
              }
            });
          }}
        >
          <div aria-hidden="true" className={styles.dialogHandle} />
          <div className={styles.dialogHeader}>
            <div>
              <Dialog.Title className={styles.dialogTitle}>
                {title}
              </Dialog.Title>
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
