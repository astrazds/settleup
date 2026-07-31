import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
  type MetaFunction,
} from "react-router";
import type { ReactNode } from "react";

import { RootErrorView } from "./components/error-view";
import globalStyles from "./styles/global.css?url";
import styles from "./styles/root.module.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export const meta: MetaFunction = () => [
  { title: "SettleUp — Everyone pays. Every cent lands." },
  {
    name: "description",
    content:
      "Create a private shared-expense event, keep every equal split cent-exact, and see one clear next settlement step.",
  },
  { property: "og:type", content: "website" },
  { property: "og:title", content: "SettleUp" },
  {
    property: "og:description",
    content: "Everyone pays. Every cent lands.",
  },
  { property: "og:image", content: "/og.png" },
  {
    property: "og:image:alt",
    content: "The SettleUp Session Cut landing page and private event form.",
  },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "SettleUp" },
  {
    name: "twitter:description",
    content: "Everyone pays. Every cent lands.",
  },
  { name: "twitter:image", content: "/og.png" },
  {
    name: "twitter:image:alt",
    content: "The SettleUp Session Cut landing page and private event form.",
  },
  { name: "robots", content: "noindex, nofollow, noarchive" },
  { name: "referrer", content: "no-referrer" },
  { name: "theme-color", content: "#e0b12e", media: "(prefers-color-scheme: light)" },
  { name: "theme-color", content: "#0b0b0b", media: "(prefers-color-scheme: dark)" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
      </head>
      <body>
        <a className={styles.skipLink} href="#main-content">
          Skip to main content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div className={styles.app}>
      <Outlet />
    </div>
  );
}

export function HydrateFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading SettleUp"
      className={styles.shell}
      id="main-content"
    >
      <div className={styles.loadingPage}>
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
      </div>
    </main>
  );
}

export function ErrorBoundary() {
  return <RootErrorView />;
}
