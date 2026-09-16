import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  fetchSubscription,
  removeSubscription,
  saveSubscription
} from "../api/subscriptions";
import { useAuthContext } from "../contexts/AuthContext";

export function useEntitySubscription(entityType, entityId, { labels } = {}) {
  const { user } = useAuthContext();
  const userId = user?.id != null ? String(user.id) : "";
  const id = entityId != null ? String(entityId).trim() : "";
  const [subscribed, setSubscribed] = useState(false);
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !entityType || !id) {
      setSubscribed(false);
      setNotifyInapp(true);
      setNotifyEmail(false);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchSubscription(entityType, id)
      .then(payload => {
        if (cancelled) return;
        const item = payload?.item || null;
        setSubscribed(Boolean(payload?.subscribed && item));
        setNotifyInapp(item ? item.notifyInapp !== false : true);
        setNotifyEmail(item ? item.notifyEmail === true : false);
      })
      .catch(err => {
        console.error("Error loading subscription:", err);
        if (!cancelled) {
          setSubscribed(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, id, userId]);

  const toggleSubscribe = useCallback(async () => {
    if (!entityType || !id || saving) return;
    setSaving(true);
    const next = !subscribed;
    try {
      if (next) {
        const payload = await saveSubscription(entityType, id, {
          notifyInapp: true,
          notifyEmail: false
        });
        const item = payload?.item;
        setSubscribed(true);
        setNotifyInapp(item ? item.notifyInapp !== false : true);
        setNotifyEmail(item ? item.notifyEmail === true : false);
        toast.success(labels?.subscribed || "Abonnement activé");
      } else {
        await removeSubscription(entityType, id);
        setSubscribed(false);
        setNotifyInapp(true);
        setNotifyEmail(false);
        toast.info(labels?.unsubscribed || "Abonnement retiré");
      }
    } catch (err) {
      console.error("Error toggling subscription:", err);
      toast.error(err.message || labels?.error || "Impossible de mettre à jour l'abonnement");
    } finally {
      setSaving(false);
    }
  }, [entityType, id, labels, saving, subscribed]);

  const setChannels = useCallback(
    async ({ notifyInapp: nextInapp, notifyEmail: nextEmail } = {}) => {
      if (!entityType || !id || saving) return;
      setSaving(true);
      try {
        const payload = await saveSubscription(entityType, id, {
          notifyInapp: typeof nextInapp === "boolean" ? nextInapp : notifyInapp,
          notifyEmail: typeof nextEmail === "boolean" ? nextEmail : notifyEmail
        });
        const item = payload?.item;
        setSubscribed(true);
        setNotifyInapp(item ? item.notifyInapp !== false : true);
        setNotifyEmail(item ? item.notifyEmail === true : false);
      } catch (err) {
        console.error("Error updating subscription channels:", err);
        toast.error(err.message || labels?.error || "Impossible de mettre à jour l'abonnement");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [entityType, id, labels, notifyEmail, notifyInapp, saving]
  );

  return {
    subscribed,
    notifyInapp,
    notifyEmail,
    loading,
    saving,
    toggleSubscribe,
    setChannels
  };
}
