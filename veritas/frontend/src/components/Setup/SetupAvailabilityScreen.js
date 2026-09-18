import { Icon } from "@iconify/react";
import AppVersion from "../Misc/AppVersion";
import SetupLanguageSwitcher from "./SetupLanguageSwitcher";
import SetupThemeSwitcher from "./SetupThemeSwitcher";
import styles from "./SetupAvailabilityScreen.module.css";

export default function SetupAvailabilityScreen({
  reason = "server",
  locale,
  onLocaleChange,
  theme = "light",
  onThemeChange,
  copy,
  onRetry,
  retrying = false
}) {
  const isDatabase = reason === "database";
  const title = isDatabase ? copy.databaseTitle : copy.serverTitle;
  const body = isDatabase ? copy.databaseBody : copy.serverBody;
  const icon = isDatabase ? "mdi:database-off-outline" : "mdi:cloud-off-outline";
  const themeAria = theme === "dark" ? copy.themeUseLight : copy.themeUseDark;

  return (
    <div className={styles.shell} data-wizard-theme={theme}>
      <div className={styles.toolbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden>
            V
          </div>
          <span className={styles.brandName}>Veritas</span>
          <AppVersion variant="dark" />
        </div>
        <div className={styles.tools}>
          {onThemeChange ? (
            <SetupThemeSwitcher theme={theme} onChange={onThemeChange} ariaLabel={themeAria} />
          ) : null}
          {onLocaleChange ? <SetupLanguageSwitcher locale={locale} onChange={onLocaleChange} /> : null}
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.card} role="alert">
          <div className={styles.iconWrap} aria-hidden>
            <Icon icon={icon} />
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.body}>{body}</p>
          <p className={styles.hint}>{copy.hint}</p>
          <button type="button" className={styles.retryBtn} onClick={onRetry} disabled={retrying}>
            <Icon icon={retrying ? "mdi:loading" : "mdi:refresh"} className={retrying ? styles.spin : undefined} aria-hidden />
            {retrying ? copy.retrying : copy.retry}
          </button>
        </div>
      </main>
    </div>
  );
}
