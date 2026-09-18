import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSetupStatus } from "../../api/setup";
import { useSetupLocale } from "./useSetupLocale";
import { useSetupTheme } from "./useSetupTheme";
import SetupAvailabilityScreen from "./SetupAvailabilityScreen";

export default function SetupGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useSetupLocale();
  const { theme, setTheme } = useSetupTheme();
  const [ready, setReady] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState(null);
  const hasBeenReadyRef = useRef(false);
  const checkSeqRef = useRef(0);

  const check = useCallback(async ({ isRetry = false } = {}) => {
    const seq = ++checkSeqRef.current;
    if (isRetry) setRetrying(true);
    try {
      const status = await getSetupStatus();
      if (seq !== checkSeqRef.current) return;

      if (
        status.unavailableReason === "database" ||
        (status.databaseReachable === false && !status.needsSetup)
      ) {
        setUnavailableReason("database");
        setReady(true);
        hasBeenReadyRef.current = true;
        if (location.pathname === "/setup") {
          navigate("/", { replace: true });
        }
        return;
      }

      setUnavailableReason(null);
      const onSetup = location.pathname === "/setup";
      if (status.needsSetup && !onSetup) {
        setReady(false);
        navigate("/setup", { replace: true });
        return;
      }
      if (!status.needsSetup && onSetup) {
        setReady(false);
        navigate("/login", { replace: true });
        return;
      }
      setReady(true);
      hasBeenReadyRef.current = true;
    } catch {
      if (seq !== checkSeqRef.current) return;
      setUnavailableReason("server");
      setReady(true);
      hasBeenReadyRef.current = true;
      if (location.pathname === "/setup") {
        navigate("/", { replace: true });
      }
    } finally {
      if (seq === checkSeqRef.current) setRetrying(false);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!hasBeenReadyRef.current) {
      setReady(false);
    }
    check();
  }, [check]);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "0.75rem",
          color: "#64748b",
          background: theme === "dark" ? "#060a10" : "#0f1c2e"
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid #dde3ed",
            borderTopColor: "#2b5fab",
            borderRadius: "50%",
            animation: "setupGateSpin 0.7s linear infinite"
          }}
        />
        <p style={{ margin: 0, fontSize: "0.95rem", color: "#9eb0c8" }}>
          {t.availability?.checking || "Checking installation…"}
        </p>
        <style>{`@keyframes setupGateSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (unavailableReason) {
    return (
      <SetupAvailabilityScreen
        reason={unavailableReason}
        locale={locale}
        onLocaleChange={setLocale}
        theme={theme}
        onThemeChange={setTheme}
        copy={{
          ...(t.availability || {}),
          themeUseLight: t.layout?.themeUseLight,
          themeUseDark: t.layout?.themeUseDark
        }}
        onRetry={() => check({ isRetry: true })}
        retrying={retrying}
      />
    );
  }

  return children;
}
