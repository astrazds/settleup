import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import {
  NavigationType,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router";

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
  const navigationType = useNavigationType();
  const locationState: unknown = useLocation().state;
  const openerId =
    navigationType !== NavigationType.Pop &&
    typeof locationState === "object" &&
    locationState !== null &&
    "routeDialogOpenerId" in locationState &&
    typeof locationState.routeDialogOpenerId === "string"
      ? locationState.routeDialogOpenerId
      : null;

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
            requestAnimationFrame(() => {
              const main = document.getElementById("main-content");
              if (
                document.activeElement !== document.body &&
                document.activeElement !== main
              ) {
                return;
              }

              const opener = openerId ? document.getElementById(openerId) : null;
              (opener ?? main)?.focus();
            });
          }}
        >
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
