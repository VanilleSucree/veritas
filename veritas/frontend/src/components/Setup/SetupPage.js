import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SetupWizardLayout from "./SetupWizardLayout";
import SetupField from "./SetupField";
import SetupNumberInput from "./SetupNumberInput";
import SetupIntro from "./SetupIntro";
import { createSetupAdmin, generateSetupSecrets, getSetupStatus, getSetupMigrationProgress, runSetupMigrationStep, saveSetupDatabase, saveSetupEnv } from "../../api/setup";
import { showError, showSuccess } from "../../utils/toast";
import { interpolate } from "./setupTranslations";
import { resolveSetupError } from "./setupErrors";
import { useSetupValidation } from "./useSetupValidation";
import { useSetupLocale } from "./useSetupLocale";
import { useSetupTheme } from "./useSetupTheme";
import { deriveSetupPortFromApiUrl } from "./setupEnvUtils";
import WizardAnimatedBackground from "./WizardAnimatedBackground";
import SetupPasswordStrength from "./SetupPasswordStrength";
import SetupMfaStep from "./SetupMfaStep";
import { isStrongPassword, ADMIN_PASSWORD_MIN_LENGTH } from "../../utils/passwordPolicy";
import styles from "./SetupWizard.module.css";
function firstIncompleteStep(steps) {
  if (!steps?.env) return 1;
  if (!steps?.database) return 2;
  if (!steps?.schema) return 3;
  if (!steps?.admin) return 4;
  if (!steps?.mfa) return 5;
  return 5;
}
export default function SetupPage() {
  const navigate = useNavigate();
  const {
    locale,
    setLocale,
    t
  } = useSetupLocale();
  const {
    theme,
    setTheme
  } = useSetupTheme();
  const validationHandlers = useSetupValidation(t.validation);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("veritas-setup-intro-seen"));
  const [step, setStep] = useState(1);
  const [steps, setSteps] = useState({
    env: false,
    database: false,
    schema: false,
    admin: false,
    mfa: false
  });
  const [loading, setLoading] = useState(false);
  const [migrationLog, setMigrationLog] = useState([]);
  const [migrationProgress, setMigrationProgress] = useState({
    completed: 0,
    total: 0,
    remaining: 0
  });
  const [migrationCurrent, setMigrationCurrent] = useState("");
  const [envForm, setEnvForm] = useState({
    jwtSecret: "",
    encryptionKey: "",
    allowedOrigins: "http://localhost:3000",
    frontendBaseUrl: "http://localhost:3000",
    apiBaseUrl: "http://localhost:3001"
  });
  const [dbForm, setDbForm] = useState({
    db_host: "localhost",
    db_port: "5432",
    db_name: "veritas_db",
    db_user: "veritas_user",
    db_password: ""
  });
  const [adminForm, setAdminForm] = useState({
    email: "",
    username: "",
    password: "",
    passwordConfirm: ""
  });
  const hasInitializedStep = useRef(false);
  const hasPrefillDb = useRef(false);
  const [databaseFromEnv, setDatabaseFromEnv] = useState(false);
  const stepMeta = useMemo(() => [{
    id: 1,
    label: t.layout.steps.env,
    key: "env"
  }, {
    id: 2,
    label: t.layout.steps.database,
    key: "database"
  }, {
    id: 3,
    label: t.layout.steps.schema,
    key: "schema"
  }, {
    id: 4,
    label: t.layout.steps.admin,
    key: "admin"
  }, {
    id: 5,
    label: t.layout.steps.mfa,
    key: "mfa"
  }], [t]);
  const refreshStatus = useCallback(async () => {
    const status = await getSetupStatus();
    if (
      status.unavailableReason === "database" ||
      (status.databaseReachable === false && !status.needsSetup)
    ) {
      navigate("/", { replace: true });
      return;
    }
    if (!status.needsSetup) {
      navigate("/login", {
        replace: true
      });
      return;
    }
    setSteps(status.steps);
    setDatabaseFromEnv(Boolean(status.databaseFromEnv));
    if (!hasPrefillDb.current && status.databaseDefaults) {
      hasPrefillDb.current = true;
      setDbForm(prev => ({
        ...prev,
        ...status.databaseDefaults
      }));
    }
    if (!hasInitializedStep.current) {
      hasInitializedStep.current = true;
      setStep(firstIncompleteStep(status.steps));
    }
  }, [navigate]);
  useEffect(() => {
    refreshStatus().catch(() => {
      // Gate shows the dedicated unreachable screen; avoid toast noise on /setup.
      navigate("/", { replace: true });
    });
  }, [refreshStatus, navigate]);
  useEffect(() => {
    if (step !== 4 && step !== 5) return undefined;
    getSetupStatus().then(status => {
      if (!status.needsSetup) {
        navigate("/login", {
          replace: true
        });
        return;
      }
      setSteps(status.steps);
    }).catch(() => {});
    return undefined;
  }, [step, navigate]);
  const handleGenerateSecrets = async () => {
    try {
      const data = await generateSetupSecrets();
      setEnvForm(prev => ({
        ...prev,
        jwtSecret: data.jwtSecret,
        encryptionKey: data.encryptionKey
      }));
      showSuccess(t.toasts.secretsGenerated);
    } catch (err) {
      showError(resolveSetupError(err, t));
    }
  };
  const handleSaveEnv = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveSetupEnv({
        jwtSecret: envForm.jwtSecret || undefined,
        encryptionKey: envForm.encryptionKey || undefined,
        allowedOrigins: envForm.allowedOrigins,
        frontendBaseUrl: envForm.frontendBaseUrl,
        port: deriveSetupPortFromApiUrl(envForm.apiBaseUrl),
        apiBaseUrl: envForm.apiBaseUrl
      });
      setSteps(result.steps);
      showSuccess(result.frontendEnvUpdated ? t.toasts.envSavedRestartFrontend : t.toasts.envSaved);
      setStep(2);
    } catch (err) {
      showError(resolveSetupError(err, t));
    } finally {
      setLoading(false);
    }
  };
  const handleSaveDatabase = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveSetupDatabase({
        ...dbForm,
        db_port: Number(dbForm.db_port)
      });
      setSteps(result.steps);
      showSuccess(t.toasts.dbValidated);
      setStep(3);
    } catch (err) {
      showError(resolveSetupError(err, t));
    } finally {
      setLoading(false);
    }
  };
  const handleMigrate = async () => {
    setLoading(true);
    setMigrationLog([]);
    setMigrationCurrent("");
    setMigrationProgress({
      completed: 0,
      total: 0,
      remaining: 0
    });
    let appliedCount = 0;
    try {
      const plan = await getSetupMigrationProgress();
      setMigrationProgress({
        completed: plan.completed,
        total: plan.total,
        remaining: plan.remaining
      });
      let result;
      do {
        result = await runSetupMigrationStep();
        if (result.progress) {
          setMigrationProgress(result.progress);
        }
        if (result.executed) {
          appliedCount += 1;
          setMigrationCurrent(result.executed.label || result.executed.filename);
          setMigrationLog(prev => [...prev, result.executed]);
        }
      } while (!result.done);
      if (result.steps) {
        setSteps(result.steps);
      }
      showSuccess(interpolate(t.toasts.migrationsApplied, {
        count: appliedCount
      }));
      if (result.steps?.schema) setStep(4);
    } catch (err) {
      if (appliedCount > 0) {
        await refreshStatus().catch(() => {});
      }
      showError(resolveSetupError(err, t));
    } finally {
      setLoading(false);
      setMigrationCurrent("");
    }
  };
  const handleCreateAdmin = async e => {
    e.preventDefault();
    if (steps.admin) {
      setStep(5);
      return;
    }
    if (adminForm.password !== adminForm.passwordConfirm) {
      showError(t.toasts.passwordMismatch);
      return;
    }
    if (!isStrongPassword(adminForm.password)) {
      showError(t.toasts.passwordWeak);
      return;
    }
    setLoading(true);
    try {
      await createSetupAdmin({
        email: adminForm.email,
        username: adminForm.username || undefined,
        password: adminForm.password
      });
      setSteps(prev => ({
        ...prev,
        admin: true
      }));
      setStep(5);
    } catch (err) {
      if (err?.code === "SETUP_ADMIN_ALREADY_EXISTS") {
        setSteps(prev => ({
          ...prev,
          admin: true
        }));
        setStep(5);
        return;
      }
      showError(resolveSetupError(err, t));
    } finally {
      setLoading(false);
    }
  };
  const handleStepClick = nextStep => {
    if (nextStep === 5 && steps.admin && !steps.mfa) {
      setStep(5);
      return;
    }
    setStep(nextStep);
  };
  const handleMfaComplete = () => {
    showSuccess(t.toasts.setupComplete);
    navigate("/login", {
      replace: true
    });
  };
  return <AnimatePresence mode="wait">
      {showIntro ? <SetupIntro key="setup-intro" text={t.intro} onComplete={() => {
      sessionStorage.setItem("veritas-setup-intro-seen", "1");
      setShowIntro(false);
    }} /> : <motion.div key="setup-wizard" className={styles.setupShell} data-wizard-theme={theme} initial={{
      opacity: 0,
      scale: 0.98
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1]
    }}>
          <WizardAnimatedBackground theme={theme} />
          <SetupWizardLayout step={step} steps={steps} stepMeta={stepMeta} onStepClick={handleStepClick} locale={locale} onLocaleChange={setLocale} theme={theme} onThemeChange={setTheme} themeAriaLabel={theme === "dark" ? t.layout.themeUseLight : t.layout.themeUseDark} wideCard={step === 5} layoutText={t.layout}>
      {step === 1 && <form onSubmit={handleSaveEnv} className={styles.form}>
          <h2 className={styles.title}>{t.env.title}</h2>
          <p className={styles.subtitle}>{t.env.subtitle}</p>

          <SetupField id="jwtSecret" label={t.env.jwtSecret.label} hint={t.env.jwtSecret.hint}>
            <input id="jwtSecret" type="text" value={envForm.jwtSecret} onChange={e => setEnvForm({
              ...envForm,
              jwtSecret: e.target.value
            })} placeholder={t.env.jwtSecret.placeholder} />
          </SetupField>

          <SetupField id="encryptionKey" label={t.env.encryptionKey.label} hint={t.env.encryptionKey.hint}>
            <input id="encryptionKey" type="text" value={envForm.encryptionKey} onChange={e => setEnvForm({
              ...envForm,
              encryptionKey: e.target.value
            })} placeholder={t.env.encryptionKey.placeholder} />
          </SetupField>

          <SetupField id="allowedOrigins" label={t.env.allowedOrigins.label} hint={t.env.allowedOrigins.hint}>
            <input id="allowedOrigins" type="text" required value={envForm.allowedOrigins} onChange={e => setEnvForm({
              ...envForm,
              allowedOrigins: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <SetupField id="frontendBaseUrl" label={t.env.frontendBaseUrl.label} hint={t.env.frontendBaseUrl.hint}>
            <input id="frontendBaseUrl" type="url" required value={envForm.frontendBaseUrl} onChange={e => setEnvForm({
              ...envForm,
              frontendBaseUrl: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <SetupField id="apiBaseUrl" label={t.env.apiBaseUrl.label} hint={t.env.apiBaseUrl.hint}>
            <input id="apiBaseUrl" type="url" required value={envForm.apiBaseUrl} onChange={e => setEnvForm({
              ...envForm,
              apiBaseUrl: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={handleGenerateSecrets}>
              {t.env.generateSecrets}
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? t.env.saving : t.env.continue}
            </button>
          </div>
        </form>}

      {step === 2 && <form onSubmit={handleSaveDatabase} className={styles.form}>
          <h2 className={styles.title}>{t.database.title}</h2>
          <p className={styles.subtitle}>{databaseFromEnv ? t.database.subtitleDocker : t.database.subtitle}</p>

          <div className={styles.grid}>
            <SetupField id="db_host" label={t.database.host.label} hint={t.database.host.hint}>
              <input id="db_host" required value={dbForm.db_host} onChange={e => setDbForm({
                ...dbForm,
                db_host: e.target.value
              })} {...validationHandlers} />
            </SetupField>
            <SetupField id="db_port" label={t.database.port.label} hint={t.database.port.hint}>
              <SetupNumberInput id="db_port" required min={1} max={65535} value={dbForm.db_port} onChange={e => setDbForm({
                ...dbForm,
                db_port: e.target.value
              })} {...validationHandlers} />
            </SetupField>
          </div>

          <SetupField id="db_name" label={t.database.name.label} hint={t.database.name.hint}>
            <input id="db_name" required value={dbForm.db_name} onChange={e => setDbForm({
              ...dbForm,
              db_name: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <SetupField id="db_user" label={t.database.user.label} hint={t.database.user.hint}>
            <input id="db_user" required value={dbForm.db_user} onChange={e => setDbForm({
              ...dbForm,
              db_user: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <SetupField id="db_password" label={t.database.password.label} hint={t.database.password.hint}>
            <input id="db_password" type="password" required value={dbForm.db_password} onChange={e => setDbForm({
              ...dbForm,
              db_password: e.target.value
            })} {...validationHandlers} />
          </SetupField>

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setStep(1)}>
              {t.database.back}
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? t.database.testing : t.database.testContinue}
            </button>
          </div>
        </form>}

      {step === 3 && <div className={styles.form}>
          <h2 className={styles.title}>{t.schema.title}</h2>
          <p className={styles.subtitle}>{t.schema.subtitle}</p>

          {loading && migrationProgress.total > 0 && <div className={styles.migrationProgressWrap}>
              <div className={styles.migrationProgressMeta}>
                <span>
                  {interpolate(t.schema.progress, {
                  completed: migrationProgress.completed,
                  total: migrationProgress.total
                })}
                </span>
                {migrationCurrent && <span className={styles.migrationCurrent}>
                    {interpolate(t.schema.applying, {
                  name: migrationCurrent
                })}
                  </span>}
              </div>
              <div className={styles.migrationProgressBar} role="progressbar" aria-valuemin={0} aria-valuemax={migrationProgress.total} aria-valuenow={migrationProgress.completed}>
                <div className={styles.migrationProgressFill} style={{
                width: `${migrationProgress.total ? Math.round(migrationProgress.completed / migrationProgress.total * 100) : 0}%`
              }} />
              </div>
            </div>}

          {migrationLog.length > 0 && <ul className={styles.log}>
              {migrationLog.map(entry => <li key={entry.filename} className={styles.logItem}>
                  <span className={styles.logOk} aria-hidden>✓</span>
                  <span className={styles.logLabel}>{entry.label || entry.filename}</span>
                  {entry.filename && entry.label !== entry.filename && <span className={styles.logFile}>{entry.filename}</span>}
                </li>)}
            </ul>}

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setStep(2)}>
              {t.schema.back}
            </button>
            <button type="button" className={styles.btnPrimary} disabled={loading} onClick={handleMigrate}>
              {loading ? t.schema.running : steps.schema ? t.schema.rerun : t.schema.run}
            </button>
            {steps.schema && <button type="button" className={styles.btnPrimary} onClick={() => setStep(4)}>
                {t.schema.continue}
              </button>}
          </div>
        </div>}

      {step === 4 && <form onSubmit={handleCreateAdmin} className={styles.form}>
          <h2 className={styles.title}>{t.admin.title}</h2>
          <p className={styles.subtitle}>{t.admin.subtitle}</p>

          {steps.admin ? <p className={styles.adminReadyNotice} role="status">
              {t.admin.alreadyCreated}
            </p> : <>
              <SetupField id="email" label={t.admin.email.label} hint={t.admin.email.hint}>
                <input id="email" type="email" required value={adminForm.email} onChange={e => setAdminForm({
                ...adminForm,
                email: e.target.value
              })} {...validationHandlers} />
              </SetupField>

              <SetupField id="username" label={t.admin.username.label} hint={t.admin.username.hint}>
                <input id="username" value={adminForm.username} onChange={e => setAdminForm({
                ...adminForm,
                username: e.target.value
              })} />
              </SetupField>

              <SetupField id="password" label={t.admin.password.label} hint={t.admin.password.hint}>
                <input id="password" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} value={adminForm.password} onChange={e => setAdminForm({
                ...adminForm,
                password: e.target.value
              })} {...validationHandlers} />
                <SetupPasswordStrength password={adminForm.password} copy={t.admin.passwordStrength} />
              </SetupField>

              <SetupField id="passwordConfirm" label={t.admin.passwordConfirm.label} hint={t.admin.passwordConfirm.hint}>
                <input id="passwordConfirm" type="password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} value={adminForm.passwordConfirm} onChange={e => setAdminForm({
                ...adminForm,
                passwordConfirm: e.target.value
              })} {...validationHandlers} />
              </SetupField>
            </>}

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setStep(3)}>
              {t.admin.back}
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading || !steps.admin && !isStrongPassword(adminForm.password)}>
              {loading ? t.admin.creating : t.admin.continueToMfa}
            </button>
          </div>
        </form>}

      {step === 5 && <SetupMfaStep copy={t.mfa} loading={loading} onLoadingChange={setLoading} onComplete={handleMfaComplete} />}
          </SetupWizardLayout>
        </motion.div>}
    </AnimatePresence>;
}
