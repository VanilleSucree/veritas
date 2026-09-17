import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchSettings } from "../../api/settings";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getAdminGeneralSettingsCopy } from "./adminGeneralSettingsI18n";
import { Card, Field, Input, Btn, FormGrid, Modal, NumberStepper } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import s from "./AdminGeneralSettingsPlatform.module.css";
const EMPTY = {
  db_host: "",
  db_port: "5432",
  db_name: "",
  db_user: "",
  db_password: ""
};
export default function AdminGeneralSettingsDatabase() {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getAdminGeneralSettingsCopy(locale), [locale]);
  const dbCopy = copy.database;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [maintaining, setMaintaining] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [stats, setStats] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  useEffect(() => {
    fetchSettings().then(rows => {
      const map = rows.reduce((acc, row) => ({
        ...acc,
        [row.key]: row.value
      }), {});
      setForm({
        ...EMPTY,
        ...map,
        db_password: ""
      });
    }).catch(() => toast.error(dbCopy.loadError)).finally(() => setLoading(false));
  }, [dbCopy.loadError]);
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/db-status`, {
        credentials: "include"
      });
      const data = await res.json();
      setConnectionStatus(data.status === "ok" ? "ok" : "error");
    } catch {
      setConnectionStatus("error");
    }
  }, []);
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/db-stats`, {
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStats(data);
        setConnectionStatus(data.connected ? "ok" : "error");
      } else {
        // Auth/permission errors must not flip a healthy /db-status to "Indisponible".
        setStats(null);
        if (res.status !== 401 && res.status !== 403) {
          setConnectionStatus("error");
        }
      }
    } catch {
      setStats(null);
      setConnectionStatus("error");
    } finally {
      setStatsLoading(false);
    }
  }, []);
  useEffect(() => {
    loadStatus();
    loadStats();
  }, [loadStatus, loadStats]);
  const setField = (key, value) => setForm(prev => ({
    ...prev,
    [key]: value
  }));
  const applyConfiguration = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/db-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || dbCopy.saveError);
      }
      toast.success(dbCopy.saveSuccess);
      if (data.restartRecommended) {
        toast.info(dbCopy.applyRestartHint, {
          autoClose: 8000
        });
      }
      setSaveConfirmOpen(false);
      await loadStatus();
      await loadStats();
    } catch (err) {
      toast.error(err.message || dbCopy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/db-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setTestResult(data);
      if (data.connectionOk) setConnectionStatus("ok");else setConnectionStatus("error");
    } catch (err) {
      setTestResult({
        success: false,
        connectionOk: false,
        veritasOk: false,
        error: dbCopy.testError,
        details: err.message
      });
      setConnectionStatus("error");
    } finally {
      setTesting(false);
    }
  };
  const runMaintenance = async () => {
    setMaintaining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/db-maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          action: "vacuum_analyze"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || dbCopy.maintenanceError);
      }
      toast.success(dbCopy.maintenanceSuccess);
      await loadStats();
    } catch (err) {
      toast.error(err.message || dbCopy.maintenanceError);
    } finally {
      setMaintaining(false);
    }
  };
  const statusLabel = connectionStatus === "ok" ? dbCopy.statusOk : connectionStatus === "error" ? dbCopy.statusError : dbCopy.statusLoading;
  const statusClass = connectionStatus === "ok" ? s.statusOk : connectionStatus === "error" ? s.statusError : s.statusLoading;
  const renderVeritasChecks = result => {
    if (!result?.veritas) return null;
    const {
      checks = [],
      referenceSchemaInstalled
    } = result.veritas;
    return <div className={s.veritasChecks}>
        <h4 className={s.veritasChecksTitle}>{dbCopy.testVeritasTitle}</h4>
        <ul className={s.veritasChecksList}>
          {checks.map(check => <li key={check.table} className={check.ok ? s.veritasCheckOk : s.veritasCheckFail}>
              <Icon icon={check.ok ? "mdi:check-circle" : "mdi:close-circle"} aria-hidden />
              <span>
                {dbCopy.veritasTables?.[check.key] || check.table}
                <code className={s.veritasTableCode}>{check.table}</code>
              </span>
            </li>)}
          <li className={referenceSchemaInstalled ? s.veritasCheckOk : s.veritasCheckFail}>
            <Icon icon={referenceSchemaInstalled ? "mdi:check-circle" : "mdi:close-circle"} aria-hidden />
            <span>
              {referenceSchemaInstalled ? dbCopy.referenceSchemaOk : dbCopy.referenceSchemaMissing}
            </span>
          </li>
        </ul>
      </div>;
  };
  if (loading) {
    return <p className={adminUi.adminMutedText}>{copy.loading}</p>;
  }
  return <>
      <FormGrid cols={2} className={s.cardRow}>
        <Card title={dbCopy.statsTitle} description={dbCopy.statsDescription}>
          <div className={s.statsHeader}>
            <span className={`${s.statusBadge} ${statusClass}`}>{statusLabel}</span>
            <Btn variant="secondary" icon="mdi:refresh" onClick={loadStats} disabled={statsLoading}>
              {statsLoading ? dbCopy.refreshing : dbCopy.refreshStats}
            </Btn>
          </div>
          {statsLoading && !stats ? <p className={adminUi.adminMutedText}>{dbCopy.statsLoading}</p> : stats ? <>
              <div className={s.statsGrid}>
                <div className={s.statCard}>
                  <div className={s.statValue}>{stats.sizePretty || "—"}</div>
                  <div className={s.statLabel}>{dbCopy.sizeLabel}</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statValue}>{stats.tableCount ?? "—"}</div>
                  <div className={s.statLabel}>{dbCopy.tablesLabel}</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statValue}>
                    {stats.activeConnections != null ? `${stats.activeConnections}/${stats.maxConnections ?? "?"}` : "—"}
                  </div>
                  <div className={s.statLabel}>{dbCopy.connectionsLabel}</div>
                </div>
              </div>
              {stats.version && <p className={s.versionLine}>
                  <strong>{dbCopy.versionLabel}:</strong> {stats.version}
                </p>}
              {Array.isArray(stats.topTables) && stats.topTables.length > 0 && <div className={s.topTables}>
                  <h4 className={s.topTablesTitle}>{dbCopy.topTablesTitle}</h4>
                  <ul className={s.topTablesList}>
                    {stats.topTables.map(table => <li key={table.name}>
                        <span>{table.name}</span>
                        <span>{table.sizePretty}</span>
                      </li>)}
                  </ul>
                </div>}
            </> : <p className={adminUi.adminMutedText}>{dbCopy.statsUnavailable}</p>}
        </Card>

        <Card title={dbCopy.connectionTitle} description={dbCopy.connectionDescription}>
          <div className={s.dbWarning} role="alert">
            <Icon icon="mdi:alert-outline" className={s.dbWarningIcon} aria-hidden />
            <div>
              <strong className={s.dbWarningTitle}>{dbCopy.warningTitle}</strong>
              <p className={s.dbWarningText}>{dbCopy.warningText}</p>
            </div>
          </div>

          <FormGrid cols={2}>
            <Field label={dbCopy.hostLabel}>
              <Input value={form.db_host} onChange={e => setField("db_host", e.target.value)} placeholder="localhost" />
            </Field>
            <Field label={dbCopy.portLabel}>
              <NumberStepper block value={form.db_port || 5432} onChange={value => setField("db_port", String(value))} min={1} max={65535} ariaLabel={dbCopy.portLabel} />
            </Field>
            <Field label={dbCopy.nameLabel}>
              <Input value={form.db_name} onChange={e => setField("db_name", e.target.value)} placeholder="veritas" />
            </Field>
            <Field label={dbCopy.userLabel}>
              <Input value={form.db_user} onChange={e => setField("db_user", e.target.value)} />
            </Field>
            <Field label={dbCopy.passwordLabel} hint={dbCopy.passwordHint}>
              <Input type="password" value={form.db_password} onChange={e => setField("db_password", e.target.value)} autoComplete="new-password" placeholder="••••••••" />
            </Field>
          </FormGrid>

          <div className={s.connectionActions}>
            <Btn variant="secondary" icon="mdi:connection" onClick={testConnection} disabled={saving || testing}>
              {testing ? dbCopy.testing : dbCopy.testBtn}
            </Btn>
            <Btn icon="mdi:content-save-outline" onClick={() => setSaveConfirmOpen(true)} disabled={saving || testing}>
              {saving ? common.saving : dbCopy.saveBtn}
            </Btn>
          </div>
        </Card>
      </FormGrid>

      <Card title={dbCopy.maintenanceTitle} description={dbCopy.maintenanceDescription}>
        <p className={adminUi.adminMutedText} style={{
        margin: "0 0 12px"
      }}>
          {dbCopy.maintenanceHint}
        </p>
        <Btn variant="secondary" icon="mdi:broom" onClick={runMaintenance} disabled={maintaining || connectionStatus !== "ok"}>
          {maintaining ? dbCopy.maintenanceRunning : dbCopy.maintenanceBtn}
        </Btn>
      </Card>

      <Modal open={!!testResult} onClose={() => setTestResult(null)} title={dbCopy.testModalTitle} icon="mdi:database-check-outline" width="520px" footer={<Btn onClick={() => setTestResult(null)}>{common.close}</Btn>}>
        {testResult && <div className={s.testResult}>
            <div className={s.testStep}>
              <Icon icon={testResult.connectionOk ? "mdi:check-circle" : "mdi:close-circle"} className={s.testStepIcon} style={{
            color: testResult.connectionOk ? "#16a34a" : "#dc2626"
          }} />
              <div>
                <p className={s.testTitle}>
                  {testResult.connectionOk ? dbCopy.testConnectionOk : dbCopy.testConnectionFail}
                </p>
                {testResult.message && <p className={s.testMessage}>{testResult.message}</p>}
              </div>
            </div>

            {testResult.connectionOk ? <div className={s.testStep}>
                <Icon icon={testResult.veritasOk ? "mdi:check-circle" : "mdi:alert-circle"} className={s.testStepIcon} style={{
            color: testResult.veritasOk ? "#16a34a" : "#d97706"
          }} />
                <div>
                  <p className={s.testTitle}>
                    {testResult.veritasOk ? dbCopy.testVeritasOk : dbCopy.testVeritasPartial}
                  </p>
                  {testResult.veritasMessage && <p className={s.testMessage}>{testResult.veritasMessage}</p>}
                </div>
              </div> : null}

            {testResult.details && <pre className={s.testDetails}>{testResult.details}</pre>}

            {testResult.databaseInfo && <ul className={s.testList}>
                <li>
                  <strong>{dbCopy.nameLabel}:</strong> {testResult.databaseInfo.database}
                </li>
                <li>
                  <strong>{dbCopy.hostLabel}:</strong> {testResult.databaseInfo.host}
                </li>
                <li>
                  <strong>{dbCopy.userLabel}:</strong> {testResult.databaseInfo.user}
                </li>
              </ul>}

            {testResult.connectionOk ? renderVeritasChecks(testResult) : null}
          </div>}
      </Modal>

      <Modal open={saveConfirmOpen} onClose={() => !saving && setSaveConfirmOpen(false)} title={dbCopy.saveConfirmTitle} icon="mdi:database-alert-outline" width="520px" footer={<>
            <Btn variant="secondary" onClick={() => setSaveConfirmOpen(false)} disabled={saving}>
              {dbCopy.saveCancelBtn}
            </Btn>
            <Btn icon="mdi:content-save-outline" onClick={applyConfiguration} disabled={saving}>
              {saving ? common.saving : dbCopy.saveConfirmBtn}
            </Btn>
          </>}>
        <p className={s.saveConfirmText}>{dbCopy.saveConfirmText}</p>
      </Modal>
    </>;
}
