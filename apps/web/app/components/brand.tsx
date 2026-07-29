import { Link } from "react-router";

import { LogoIcon } from "./icons";
import styles from "../styles/app.module.css";

export function Brand() {
  return (
    <Link aria-label="SettleUp home" className={styles.brand} to="/">
      <span className={styles.brandMark}>
        <LogoIcon height="18" width="18" />
      </span>
      <span>SettleUp</span>
    </Link>
  );
}
