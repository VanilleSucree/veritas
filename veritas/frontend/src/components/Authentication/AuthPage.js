import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useForceLightTheme } from "../../hooks/useForceLightTheme";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import MaintenanceBanner from "../Misc/MaintenanceBanner/MaintenanceBanner";
import SystemOutagePage from "./SystemOutagePage";
import { getMaintenanceStatus } from "../../api/maintenance";
import { getSetupStatus } from "../../api/setup";
import { showSuccess, showError } from "../../utils/toast";
import { interpolate } from "../../i18n/translate";
import { getAuthCopy } from "./authI18n";
import API_BASE_URL from "../../config";
import { fetchLoginBranding } from "../../api/loginBranding";
import { buildLoginBrandingStyleVars, buildLoginRightPanelStyle, mergeBrandingWithAuthCopy } from "../../utils/loginBrandingUtils";
import AppVersion from "../Misc/AppVersion";
import EditionBadge from "../Misc/EditionBadge";
import { getSafeReturnPath } from "../../navigation/agentRoutes";
import styles from "./AuthPage.module.css";
export default function AuthPage() {
  useForceLightTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useAppLocale();
  const copy = useMemo(() => getAuthCopy(locale), [locale]);
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    loading,
    handleLogin,
    mfaPending,
    handleMfaLogin,
    cancelMfaLogin,
    user,
    userRole
  } = useAuthContext();
  const [view, setView] = useState("login");
  const [accountType, setAccountType] = useState("agent");
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [statusRetrying, setStatusRetrying] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState("");
  const [apiVersion, setApiVersion] = useState(null);
  const [setupPending, setSetupPending] = useState(null);
  const [loginBranding, setLoginBranding] = useState(null);
  const formRef = useRef();
  const [mfaDigits, setMfaDigits] = useState(() => Array(6).fill(""));
  const mfaInputsRef = useRef([]);
  const mfaAutoSubmittedRef = useRef("");
  const mfaCode = mfaDigits.join("");
  const busy = loading || submitting;
  const isForgotView = !mfaPending && view === "forgot";
  const showAccountToggle = !mfaPending && view === "login";
  const authPanel = isForgotView ? copy.panel.forgot : copy.panel[accountType];
  const brandingSide = isForgotView ? null : loginBranding?.[accountType];
  const brandingAccountType = isForgotView ? "agent" : accountType;
  const activeBranding = useMemo(() => mergeBrandingWithAuthCopy(brandingSide, authPanel, brandingAccountType), [brandingSide, authPanel, brandingAccountType]);
  const panelHeadline = <>
      {activeBranding.headlineLine1}
      <br />
      {activeBranding.headlineLine2}
    </>;
  const brandingStyleVars = useMemo(() => activeBranding.custom && !isForgotView ? buildLoginBrandingStyleVars(activeBranding, accountType) : null, [activeBranding, accountType, isForgotView]);
  const rightPanelStyle = useMemo(() => activeBranding.custom && !isForgotView ? buildLoginRightPanelStyle(activeBranding, accountType) : undefined, [activeBranding, accountType, isForgotView]);
  const runSystemChecks = useCallback(async ({
    showRetrying = false
  } = {}) => {
    if (showRetrying) setStatusRetrying(true);
    const checkEndpoint = async (endpoint, setter) => {
      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        const json = await res.json();
        if (endpoint === "/status" && json.version) {
          setApiVersion(json.version);
        }
        setter(json.status === "ok" ? "ok" : "error");
      } catch {
        setter("error");
      }
    };
    await Promise.all([checkEndpoint("/status", setServerStatus), checkEndpoint("/db-status", setDbStatus)]);
    setLastCheck(new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    }));
    setStatusChecked(true);
    if (showRetrying) setStatusRetrying(false);
  }, []);
  useEffect(() => {
    getSetupStatus().then(status => setSetupPending(Boolean(status?.needsSetup))).catch(() => setSetupPending(false));
  }, []);
  useEffect(() => {
    fetchLoginBranding().then(data => setLoginBranding(data)).catch(() => setLoginBranding({
      pro: false,
      agent: null,
      client: null
    }));
  }, []);
  useEffect(() => {
    if (setupPending) {
      navigate("/setup", {
        replace: true
      });
    }
  }, [setupPending, navigate]);
  useEffect(() => {
    if (!user || !userRole) return;
    if (location.pathname !== "/login") return;
    const rawFrom = typeof location.state?.from === "string" ? location.state.from : "/";
    const target = userRole === "client" ? "/client" : getSafeReturnPath(rawFrom);
    navigate(target, {
      replace: true
    });
  }, [user, userRole, location.pathname, location.state, navigate]);
  useEffect(() => {
    if (setupPending) return undefined;
    runSystemChecks();
    const timer = setInterval(() => runSystemChecks(), 30000);
    getMaintenanceStatus().then(setMaintenanceStatus).catch(() => setMaintenanceStatus({
      enabled: false
    }));
    return () => clearInterval(timer);
  }, [runSystemChecks, setupPending]);
  useEffect(() => {
    if (!mfaPending) {
      setMfaDigits(Array(6).fill(""));
      mfaAutoSubmittedRef.current = "";
      return undefined;
    }
    const id = requestAnimationFrame(() => {
      mfaInputsRef.current[0]?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [mfaPending]);
  useEffect(() => {
    if (!mfaPending || busy || mfaCode.length !== 6) return;
    if (mfaAutoSubmittedRef.current === mfaCode) return;
    mfaAutoSubmittedRef.current = mfaCode;
    handleMfaLogin(mfaCode);
  }, [mfaCode, mfaPending, busy, handleMfaLogin]);
  const focusMfaInput = useCallback(index => {
    const el = mfaInputsRef.current[Math.max(0, Math.min(5, index))];
    if (!el) return;
    el.focus();
    el.select?.();
  }, []);
  const handleMfaDigitChange = useCallback((index, raw) => {
    const cleaned = String(raw ?? "").replace(/\D/g, "");
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split("");
      const next = Array.from({
        length: 6
      }, (_, i) => chars[i] || "");
      setMfaDigits(next);
      focusMfaInput(Math.min(chars.length, 5));
      return;
    }
    setMfaDigits(prev => {
      const next = [...prev];
      next[index] = cleaned.slice(-1);
      return next;
    });
    if (cleaned) focusMfaInput(index + 1);
  }, [focusMfaInput]);
  const handleMfaDigitKeyDown = useCallback((index, e) => {
    if (e.key === "Backspace") {
      if (mfaDigits[index]) {
        setMfaDigits(prev => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        e.preventDefault();
        setMfaDigits(prev => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        focusMfaInput(index - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusMfaInput(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      focusMfaInput(index + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusMfaInput(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusMfaInput(5);
    }
  }, [focusMfaInput, mfaDigits]);
  const handleMfaDigitPaste = useCallback((index, e) => {
    const text = e.clipboardData?.getData("text") || "";
    const cleaned = text.replace(/\D/g, "");
    if (!cleaned) return;
    e.preventDefault();
    const chars = cleaned.slice(0, 6 - index).split("");
    setMfaDigits(prev => {
      const next = [...prev];
      chars.forEach((d, i) => {
        next[index + i] = d;
      });
      return next;
    });
    focusMfaInput(Math.min(index + chars.length, 5));
  }, [focusMfaInput]);
  const goTo = next => {
    setPassword("");
    setShowPassword(false);
    if (next === "login") {
      const saved = localStorage.getItem("rememberedEmail");
      setEmail(saved || "");
      setRememberMe(!!saved);
    } else {
      setEmail("");
    }
    setView(next);
  };
  const handleLoginSubmit = e => {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    handleLogin(accountType);
  };
  const handleForgot = async e => {
    e.preventDefault();
    if (!email) {
      showError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          appOrigin: window.location.origin
        })
      });
      if (res.ok) {
        showSuccess(copy.toasts.forgotSuccess);
        goTo("login");
      } else {
        showError(copy.toasts.forgotError);
      }
    } finally {
      setSubmitting(false);
    }
  };
  const systemHealthy = serverStatus === "ok" && dbStatus === "ok";
  const allOk = systemHealthy;
  if (setupPending === null || setupPending) {
    return <div className={styles.statusBootScreen}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>{setupPending ? copy.boot.redirectSetup : copy.boot.checkingSetup}</p>
      </div>;
  }
  if (!statusChecked) {
    return <div className={styles.statusBootScreen}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>{copy.boot.checkingService}</p>
      </div>;
  }
  if (!systemHealthy) {
    return <SystemOutagePage serverStatus={serverStatus} dbStatus={dbStatus} lastCheck={lastCheck} onRetry={() => runSystemChecks({
      showRetrying: true
    })} retrying={statusRetrying} locale={locale} />;
  }
  return <div className={styles.wrapper} style={brandingStyleVars ? {
    "--login-accent": activeBranding.colors.accentColor
  } : undefined}>
      {maintenanceStatus?.enabled && <MaintenanceBanner message={maintenanceStatus.message} />}

      {}
      <aside className={`${styles.left} ${!activeBranding.custom && !isForgotView && accountType === "client" ? styles.leftClient : ""} ${activeBranding.custom && !isForgotView ? styles.leftBranded : ""}`} style={brandingStyleVars || undefined}>
        <div className={styles.leftTop}>
          <div className={styles.brand}>
            {activeBranding.logoUrl ? <img src={activeBranding.logoUrl} alt="" className={`${styles.brandLogo}${activeBranding.logoTransparent ? ` ${styles.brandLogoFramed}` : ""}`} style={activeBranding.logoTransparent ? {
              background: activeBranding.logoBgColor
            } : undefined} /> : <div className={styles.brandIcon}>V</div>}
            <span className={styles.brandName}>{activeBranding.brandName ?? "Veritas"}</span>
            <AppVersion variant="dark" />
          </div>
          <h2 className={styles.leftHeadline}>{panelHeadline}</h2>
          <p className={styles.leftSub}>{activeBranding.sub}</p>
        </div>
        <ul className={styles.leftFeatures}>
          {activeBranding.features.map(f => <li key={f} className={styles.leftFeature}>
              <span className={styles.leftFeatureDot} />
              {f}
            </li>)}
        </ul>
        <div className={styles.leftFooterMeta}>
          {apiVersion && <span className={styles.leftVersionMeta}>API v{apiVersion}</span>}
          <EditionBadge variant="dark" />
        </div>
      </aside>

      {}
      <main className={`${styles.right}${activeBranding.custom && !isForgotView ? ` ${styles.rightBranded}` : ""}${activeBranding.custom && !isForgotView && activeBranding.rightBgImageUrl ? ` ${styles.rightBrandedImage}` : ""}`} style={rightPanelStyle}>
        <div className={styles.card}>
          {busy && <div className={styles.loadingOverlay} aria-hidden="true">
              <span className={styles.spinner} />
            </div>}

          {}
          {showAccountToggle && <div className={styles.accountToggle}>
            <button type="button" className={`${styles.toggleBtn} ${accountType === "agent" ? styles.toggleActive : ""}`} onClick={() => {
            setAccountType("agent");
            goTo("login");
          }} disabled={busy}>
              {copy.accountToggle.agent}
            </button>
            <button type="button" className={`${styles.toggleBtn} ${accountType === "client" ? styles.toggleActive : ""}`} onClick={() => {
            setAccountType("client");
            goTo("login");
          }} disabled={busy}>
              {copy.accountToggle.client}
            </button>
          </div>}

          <header className={`${styles.cardHeader} ${mfaPending ? styles.cardHeaderMfa : ""}`}>
            {!mfaPending && view !== "login" && <button type="button" className={styles.backBtn} onClick={() => goTo("login")} disabled={busy} aria-label={copy.back} title={copy.back}>
                <Icon icon="mdi:arrow-left" aria-hidden />
              </button>}
            {mfaPending && <button type="button" className={styles.backBtn} onClick={cancelMfaLogin} disabled={busy} aria-label={copy.back} title={copy.back}>
                <Icon icon="mdi:arrow-left" aria-hidden />
              </button>}
            {mfaPending && <div className={styles.mfaPhoneAnim} aria-hidden="true">
                <div className={styles.mfaPhone}>
                  <div className={styles.mfaPhoneBezel}>
                    <div className={styles.mfaPhoneNotch} />
                    <div className={styles.mfaPhoneScreen}>
                      <div className={styles.mfaAppHeader}>
                        <span className={styles.mfaAppShield} />
                        <span className={styles.mfaAppLabel}>Authenticator</span>
                      </div>
                      <div className={styles.mfaDigits}>
                        {["4", "8", "2", "9", "1", "6"].map((d, i) => <span key={i} className={styles.mfaDigit} style={{
                      animationDelay: `${0.12 + i * 0.1}s`
                    }}>
                            {d}
                          </span>)}
                      </div>
                      <div className={styles.mfaTimerTrack}>
                        <div className={styles.mfaTimerFill} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.mfaPhoneHome} />
                  <span className={styles.mfaGlow} />
                </div>
              </div>}
            <h1 className={`${styles.cardTitle} ${mfaPending ? styles.cardTitleCentered : ""}`}>
              {mfaPending ? copy.mfa.title : copy.views[view].title}
            </h1>
            <p className={`${styles.cardSub} ${mfaPending ? styles.cardSubCentered : ""}`}>
              {mfaPending ? copy.mfa.sub : copy.views[view].sub}
            </p>
          </header>

          <div className={styles.viewBody} key={mfaPending ? "mfa" : `${view}-${accountType}`}>
            {mfaPending ? <form className={`${styles.form} ${styles.mfaForm}`} onSubmit={e => {
            e.preventDefault();
            if (mfaCode.length === 6) handleMfaLogin(mfaCode);
          }}>
                <div className={`${styles.field} ${styles.mfaField}`}>
                  <label id="mfa-code-label" htmlFor="mfa-code-0">{copy.mfa.codeLabel}</label>
                  <div className={styles.mfaOtp} role="group" aria-labelledby="mfa-code-label">
                    {mfaDigits.map((digit, index) => <input key={index} id={index === 0 ? "mfa-code-0" : undefined} ref={el => {
                  mfaInputsRef.current[index] = el;
                }} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} name={index === 0 ? "one-time-code" : undefined} maxLength={index === 0 ? 6 : 1} value={digit} disabled={busy} aria-label={`${copy.mfa.codeLabel} ${index + 1}`} className={styles.mfaOtpCell} onChange={e => handleMfaDigitChange(index, e.target.value)} onKeyDown={e => handleMfaDigitKeyDown(index, e)} onPaste={e => handleMfaDigitPaste(index, e)} onFocus={e => e.target.select()} />)}
                  </div>
                </div>
                <button type="submit" className={styles.btnPrimary} disabled={busy || mfaCode.length < 6}>
                  {copy.mfa.submit}
                </button>
              </form> : view === "login" && <form ref={formRef} className={styles.form} onSubmit={handleLoginSubmit}>
                <Field label={copy.fields.email} id="auth-email" type="email" autoComplete="email" value={email} onChange={setEmail} disabled={busy} required placeholder={accountType === "client" ? copy.placeholders.emailClient : copy.placeholders.emailAgent} />
                <PasswordField id="auth-password" label={copy.fields.password} showLabel={copy.fields.showPassword} value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(p => !p)} disabled={busy} />
                <label className={styles.checkbox}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={busy} />
                  {copy.fields.rememberMe}
                </label>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {copy.fields.login}
                </button>
                <div className={styles.formLinks}>
                  <button type="button" className={styles.link} onClick={() => goTo("forgot")} disabled={busy}>
                    {copy.fields.forgotPassword}
                  </button>
                </div>
              </form>}

            {!mfaPending && view === "forgot" && <form className={styles.form} onSubmit={handleForgot}>
                <Field label={copy.fields.email} id="forgot-email" type="email" autoComplete="email" value={email} onChange={setEmail} disabled={busy} required placeholder={copy.placeholders.email} />
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {copy.fields.sendLink}
                </button>
              </form>}
          </div>

          <footer className={styles.footer}>
            <p>{activeBranding.footerText ?? copy.footer}</p>
          </footer>
        </div>
      </main>

      {}
      <div className={styles.statusDock}>
        {statusOpen && <div className={styles.statusPanel}>
            <StatusRow label={copy.status.api} status={serverStatus} />
            <StatusRow label={copy.status.database} status={dbStatus} />
            {apiVersion && <p className={styles.statusMeta}>Veritas API v{apiVersion}</p>}
            <p className={styles.statusMeta}>{interpolate(copy.status.checkedAt, {
            time: lastCheck || "--:--"
          })}</p>
          </div>}
        <button type="button" className={`${styles.statusFab} ${allOk ? styles.statusFabOk : styles.statusFabError}`} onClick={() => setStatusOpen(p => !p)} aria-expanded={statusOpen}>
          <span className={styles.statusFabDot} />
          {copy.status.title}
        </button>
      </div>
    </div>;
}
function Field({
  label,
  id,
  type,
  value,
  onChange,
  disabled,
  required,
  autoComplete,
  placeholder
}) {
  return <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} autoComplete={autoComplete} placeholder={placeholder} />
    </div>;
}
function PasswordField({
  id,
  label,
  showLabel,
  value,
  onChange,
  show,
  onToggle,
  disabled
}) {
  return <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input id={id} type={show ? "text" : "password"} autoComplete="current-password" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required />
        <button type="button" className={styles.eyeBtn} onClick={onToggle} tabIndex={-1} aria-label={showLabel}>
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>;
}
function StatusRow({
  label,
  status
}) {
  return <div className={styles.statusRow}>
      <span>{label}</span>
      <span className={status === "ok" ? styles.dotOk : styles.dotError} />
    </div>;
}
