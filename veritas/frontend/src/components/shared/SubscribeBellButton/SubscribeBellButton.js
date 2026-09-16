import { Icon } from "@iconify/react";
import SmartTooltip from "../../SmartTooltip";
import { useEntitySubscription } from "../../../hooks/useEntitySubscription";
import styles from "../../EnterprisesPage/EnterpriseDetailPage.module.css";

/**
 * Cloche d'abonnement entité (entreprise / contact / périphérique).
 */
export default function SubscribeBellButton({
  entityType,
  entityId,
  subscribeLabel = "S’abonner aux notifications",
  unsubscribeLabel = "Se désabonner",
  subscribedToast = "Abonnement activé",
  unsubscribedToast = "Abonnement retiré",
  className = "",
  buttonClassName = ""
}) {
  const { subscribed, loading, saving, toggleSubscribe } = useEntitySubscription(entityType, entityId, {
    labels: {
      subscribed: subscribedToast,
      unsubscribed: unsubscribedToast
    }
  });

  if (!entityType || !entityId) return null;

  const label = subscribed ? unsubscribeLabel : subscribeLabel;
  const busy = loading || saving;

  return (
    <SmartTooltip content={label}>
      <button
        type="button"
        className={`${styles.heroMenuBtn} ${subscribed ? styles.heroSubscribeBtnActive : ""} ${buttonClassName} ${className}`.trim()}
        onClick={toggleSubscribe}
        disabled={busy}
        aria-pressed={subscribed}
        aria-label={label}
        aria-busy={busy || undefined}
      >
        <Icon icon={subscribed ? "mdi:bell-ring" : "mdi:bell-outline"} aria-hidden />
      </button>
    </SmartTooltip>
  );
}
