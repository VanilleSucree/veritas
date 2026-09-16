import styles from "./StatusDot.module.css";

/**
 * Pastille de statut uniforme (actif = vert, sinon = gris).
 */
export default function StatusDot({
  active = false,
  label = "",
  className = "",
  ...rest
}) {
  return (
    <span
      className={`${styles.dot} ${active ? styles.active : styles.inactive} ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}
