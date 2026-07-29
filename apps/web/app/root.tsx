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
import styles from "./styles/app.module.css";
import globalStyles from "./styles/global.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
];

export const meta: MetaFunction = () => [
  { title: "SettleUp — Split the moment. Keep it simple." },
  {
    name: "description",
    content: "A quick, private-by-link way to split shared expenses and settle up.",
  },
  { property: "og:type", content: "website" },
  { property: "og:title", content: "SettleUp" },
  {
    property: "og:description",
    content: "Split the moment. Keep it simple.",
  },
  { property: "og:image", content: "/og.png" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "SettleUp" },
  {
    name: "twitter:description",
    content: "Split the moment. Keep it simple.",
  },
  { name: "twitter:image", content: "/og.png" },
  { name: "robots", content: "noindex, nofollow, noarchive" },
  { name: "referrer", content: "no-referrer" },
  { name: "theme-color", content: "#f7f5f0", media: "(prefers-color-scheme: light)" },
  { name: "theme-color", content: "#121714", media: "(prefers-color-scheme: dark)" },
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
