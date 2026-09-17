import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { resetRateLimitBuckets } from './middleware/rateLimit.js';
dotenv.config();
if (process.env.NODE_ENV !== "production") {
  resetRateLimitBuckets();
}
import { pool, initDBConnection } from './database/db.js';
import { runPostSetupSchemaMigrations } from './services/runPostSetupSchemaMigrations.js';
import authRoutes from './routes/auth/auth.js';
import userRoutes from './routes/auth/users.js';
import profilesRouter from "./routes/auth/profiles.js";
import permissionsRouter from "./routes/config/permissions.js";
import teamsRoutes from "./routes/auth/teams.js";
import userSettingsRoutes from './routes/auth/userSettings.js';
import clientsRoutes, { modulesRouterExport } from './routes/clients/clients.js';
import campaignRoutes from './routes/clients/campaign.js';
import materialTypesRoutes from './routes/clients/materialTypes.js';
import contactsRoutes from './routes/clients/contacts.js';
import prestatairesRoutes from './routes/clients/prestataires.js';
import monitoringDocumentsRouter from "./routes/documents/monitoringDocuments.js";
import clientFilesRouter from "./routes/documents/clientFiles.js";
import vaultSecretsRouter from "./routes/documents/vaultSecrets.js";
import equipmentFilesRouter from "./routes/documents/equipmentFiles.js";
import clientPortalRouter from "./routes/clients/clientPortal.js";
import clientPortalUsersRouter from "./routes/clients/clientPortalUsers.js";
import knowledgeArticlesRouter from "./routes/knowledgeBase/knowledgeArticles.js";
import knowledgeFoldersRouter from "./routes/knowledgeBase/knowledgeFolders.js";
import knowledgeCategoriesRouter from "./routes/knowledgeBase/knowledgeCategories.js";
import knowledgeEmojisRouter from "./routes/knowledgeBase/knowledgeEmojis.js";
import publicKnowledgeRouter from "./routes/knowledgeBase/publicKnowledge.js";
import publicSupportFormsRouter from "./routes/publicSupportForms.js";
import settingsRoutes from './routes/config/settings.js';
import generalSettingsRoutes from './routes/config/generalSettings.js';
import loginBrandingRoutes from './routes/config/loginBranding.js';
import slaSettingsRoutes from './routes/config/slaSettings.js';
import contractModuleOptionsRoutes from './routes/config/contractModuleOptions.js';
import planningEventTypesRoutes from './routes/config/planningEventTypes.js';
import equipmentFamiliesRoutes from './routes/config/equipmentFamilies.js';
import maintenanceRoutes from './routes/config/maintenance.js';
import setupRoutes from './routes/config/setup.js';
import editionRoutes from './routes/config/edition.js';
import licenseRoutes from './routes/config/license.js';
import { requirePro, requireProAuth } from './middleware/edition.js';
import { getEditionPayload } from './utils/edition.js';
import { refreshProLicenseState, ensureFreshLicense } from './utils/proLicense.js';
import verifyJWT from './middleware/auth.js';
import statsRoutes from './routes/utils/stats.js';
import techNewsRoutes from './routes/utils/techNews.js';
import emailRoutes from "./routes/utils/email.js";
import testsRoutes from './routes/utils/tests.js';
import supportReportRoutes from './routes/utils/supportReport.js';
import eventsRoutes from './routes/utils/events.js';
import ticketsRoutes from './routes/utils/tickets.js';
import notificationsRoutes from './routes/utils/notifications.js';
import subscriptionsRoutes from './routes/utils/subscriptions.js';
import globalSearchRoutes from './routes/utils/globalSearch.js';
import bitdefenderRouter from "./routes/integrations/bitdefender.js";
import mailinblackRouter from "./routes/integrations/mailinblack.js";
import rmmRouter from "./routes/rmm/rmm.js";
import equipmentMonitoringAlertsRouter from "./routes/equipment/monitoringAlerts.js";
import equipmentMetaRouter from "./routes/equipment/equipmentMeta.js";
import supervisionAlertRulesRouter from "./routes/supervision/alertRules.js";
import monitoringAutomationRouter from "./routes/supervision/monitoringAutomation.js";
import supervisionAlertsRouter from "./routes/supervision/alerts.js";
import checkmkRouter from "./routes/integrations/checkmk.js";
import hycuRouter from "./routes/integrations/hycu.js";
import ovhRouter from "./routes/integrations/ovh.js";
import partnerCenterRouter from "./routes/integrations/partnerCenter.js";
import office365Router from "./routes/integrations/office365.js";
import unifiRouter from "./routes/integrations/unifi/index.js";
import unifiClientRouter from "./routes/clients/unifi-client.js";
import whatsappRouter from "./routes/integrations/whatsapp/index.js";
import office365ClientRouter from "./routes/clients/office365-client.js";
import bitdefenderClientRouter from "./routes/clients/bitdefender-client.js";
import mailinblackClientRouter from "./routes/clients/mailinblack-client.js";
import aiRouter from "./routes/ai/index.js";
import { checkMaintenanceMode } from './middleware/maintenance.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { canRunAutoSchemaMigrations, isSetupMarkedComplete, markSetupComplete } from './utils/setupState.js';
import { startMailCollectorPoller } from './services/mailCollectorPoller.js';
import { startKpiReportPoller } from './services/kpiReportPoller.js';
import { startNotificationSoonPoller } from './services/notificationSoonPoller.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function resolveFrontendBuildDir() {
  const fromEnv = (process.env.FRONTEND_BUILD_DIR || '').trim();
  const candidates = [
    fromEnv,
    path.resolve(__dirname, '../frontend/build'),
    path.resolve(__dirname, 'public')
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}
const app = express();
app.set('trust proxy', true);
const normalizeOrigin = url => {
  if (!url) return url;
  return url.replace(/\/+$/, '');
};
const DEV_DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function isLocalDevOrigin(origin) {
  if (!origin) return false;
  try {
    const {
      hostname
    } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
function getSelfSpaOrigins() {
  const port = process.env.PORT || 3001;
  const protocol = process.env.PROTOCOL || 'http';
  return [`${protocol}://localhost:${port}`, `${protocol}://127.0.0.1:${port}`];
}
function getAllowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => normalizeOrigin(origin.trim())).filter(Boolean);
  const frontendBase = normalizeOrigin((process.env.FRONTEND_BASE_URL || '').trim());
  const merged = [...fromEnv, ...getSelfSpaOrigins()];
  if (frontendBase) merged.push(frontendBase);
  if (merged.length > 0) return [...new Set(merged)];
  if (process.env.NODE_ENV !== 'production') {
    return [...DEV_DEFAULT_ORIGINS, ...getSelfSpaOrigins()];
  }
  return getSelfSpaOrigins();
}
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalizedOrigin = normalizeOrigin(origin);
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    if (!isSetupMarkedComplete() && isLocalDevOrigin(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    console.warn(`⚠️  CORS blocked — origin: "${origin}" (normalized: "${normalizedOrigin}")`);
    console.warn('   Allowed origins:', allowedOrigins);
    callback(null, false);
  },
  credentials: true,
  exposedHeaders: ["Content-Disposition", "X-Veritas-Installer-Version"]
};
app.use(cors(corsOptions));
app.use(securityHeaders);
const jsonBodyParser = express.json({
  limit: "50mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
});
app.use((req, res, next) => {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    return next();
  }
  return jsonBodyParser(req, res, next);
});
app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));
app.use(cookieParser());
app.use(checkMaintenanceMode);
app.use('/uploads/login-branding', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'");
  next();
}, express.static('uploads/login-branding'));
app.use('/uploads', verifyJWT, express.static('uploads'));
await initDBConnection();
if (await canRunAutoSchemaMigrations()) {
  try {
    await runPostSetupSchemaMigrations();
  } catch (err) {
    console.error("[startup] Post-installation migrations failed:", err.message);
  }
  // Docker rebuilds drop .setup-complete; rematerialize when DB install is already valid.
  if (!isSetupMarkedComplete()) {
    try {
      markSetupComplete();
      console.log("[setup] Restored .setup-complete marker from database state.");
    } catch (err) {
      console.warn("[setup] Could not restore .setup-complete marker:", err?.message || err);
    }
  }
} else if (!isSetupMarkedComplete()) {
  console.log("[setup] Installation in progress — create the schema via the wizard: http://localhost:3000/setup");
}
await refreshProLicenseState();
app.use('/api/setup', setupRoutes);
app.use('/api/edition', editionRoutes);
app.use('/api/license', licenseRoutes);
app.use("/api", async (req, res, next) => {
  try {
    await ensureFreshLicense();
    next();
  } catch (error) {
    console.error("[license] ensureFreshLicense:", error.message);
    next(error);
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use("/api/profiles", profilesRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/teams", requireProAuth, teamsRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/clients', campaignRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/clients-general', clientsRoutes);
app.use('/api/clients/modules', modulesRouterExport);
app.use('/api/material-types', materialTypesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/prestataires', prestatairesRoutes);
app.use("/api/monitoring-documents", requireProAuth, monitoringDocumentsRouter);
app.use("/api/client-files", requireProAuth, clientFilesRouter);
app.use("/api/vault-secrets", requireProAuth, vaultSecretsRouter);
app.use("/api/equipment-files", equipmentFilesRouter);
app.use("/api/client-portal", clientPortalRouter);
app.use("/api/client-portal-users", clientPortalUsersRouter);
app.use("/api/public/knowledge", publicKnowledgeRouter);
app.use("/api/public/support-forms", publicSupportFormsRouter);
app.use("/api/knowledge-articles", knowledgeArticlesRouter);
app.use("/api/knowledge-folders", knowledgeFoldersRouter);
app.use("/api/knowledge-categories", knowledgeCategoriesRouter);
app.use("/api/knowledge-emojis", knowledgeEmojisRouter);
app.use('/api/settings', settingsRoutes);
app.use('/api/general-settings', generalSettingsRoutes);
app.use('/api/login-branding', loginBrandingRoutes);
app.use('/api/sla-settings', slaSettingsRoutes);
app.use('/api/contract-module-options', requireProAuth, contractModuleOptionsRoutes);
app.use('/api/planning-event-types', requireProAuth, planningEventTypesRoutes);
app.use('/api/equipment-families', equipmentFamiliesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/tech-news", techNewsRoutes);
app.use("/api/email", requireProAuth, emailRoutes);
app.use("/api/events", requireProAuth, eventsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/search", globalSearchRoutes);
app.use("/api/rmm", rmmRouter);
app.use("/rmm", rmmRouter);
app.use("/api", testsRoutes);
app.use("/api", supportReportRoutes);
app.use("/api/bitdefender", bitdefenderRouter);
app.use("/api/mailinblack", mailinblackRouter);
app.use("/api/equipment-monitoring-alerts", equipmentMonitoringAlertsRouter);
app.use("/api/equipment", equipmentMetaRouter);
app.use("/api/supervision/alert-rules", supervisionAlertRulesRouter);
app.use("/api/supervision/monitoring-automation", monitoringAutomationRouter);
app.use("/api/supervision/alerts", supervisionAlertsRouter);
app.use("/api/checkmk", checkmkRouter);
app.use("/api/hycu", hycuRouter);
app.use("/api/unifi", requireProAuth, unifiRouter);
app.use("/api/client-unifi", requireProAuth, unifiClientRouter);
app.use("/api/ovh", ovhRouter);
app.use("/api/partner-center", requireProAuth, partnerCenterRouter);
app.use("/api/office365", verifyJWT, office365Router);
app.use("/api/whatsapp", requirePro, whatsappRouter);
app.use("/api/ai", aiRouter);
app.use("/api/client-office365", verifyJWT, office365ClientRouter);
app.use("/api/client-bitdefender", bitdefenderClientRouter);
app.use("/api/client-mailinblack", mailinblackClientRouter);
app.use("/maintenance", maintenanceRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/profiles", profilesRouter);
app.use("/teams", requireProAuth, teamsRoutes);
// Note: do not mount testsRoutes on "/" — its requireSetupOrAdmin catch-all would
// block the SPA and public pages. Public status lives under /api (and aliases below).
app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});
app.get('/db-status', async (req, res) => {
  if (!process.env.DATABASE_URL?.trim()) {
    return res.json({ status: 'error', error: 'Database not configured' });
  }
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    const payload = { status: 'error' };
    if (process.env.NODE_ENV !== 'production') payload.error = err.message;
    res.json(payload);
  }
});
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      ...(process.env.NODE_ENV !== 'production' ? {
        error: err.message
      } : {})
    });
  }
});
app.get('/api', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    message: 'API endpoint accessible',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      dbStatus: '/api/db-status',
      maintenance: '/api/maintenance/status',
      auth: '/api/auth/me'
    }
  });
});
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid request body."
    });
  }
  next(err);
});
const frontendBuildDir = resolveFrontendBuildDir();
if (frontendBuildDir) {
  app.use(express.static(frontendBuildDir, {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
  }));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendBuildDir, 'index.html'), err => {
      if (err) next(err);
    });
  });
}
const PORT = process.env.PORT || 3001;
function getServerIPs() {
  const interfaces = os.networkInterfaces();
  const ips = ['localhost'];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}
const PROTOCOL = process.env.PROTOCOL || 'http';
const SERVER_IPS = getServerIPs();
app.listen(PORT, '0.0.0.0', () => {
  const urls = SERVER_IPS.map(ip => `${PROTOCOL}://${ip}:${PORT}`);
  const editionInfo = getEditionPayload();
  console.log(`✅ Server running on:`);
  urls.forEach(url => console.log(`   ${url}`));
  const licenseNote = editionInfo.license?.devBypass ? " (dev Pro bypass)" : editionInfo.license?.valid ? ` (license ${editionInfo.license.status || "active"})` : editionInfo.limits ? " (Community limits active)" : "";
  console.log(`   Veritas edition: ${editionInfo.edition}${licenseNote}`);
  try {
    startMailCollectorPoller();
  } catch (err) {
    console.error("[mail-collector-poller] Failed to start:", err?.message || err);
  }
  try {
    startKpiReportPoller();
  } catch (err) {
    console.error("[kpi-report-poller] Failed to start:", err?.message || err);
  }
  try {
    startNotificationSoonPoller();
  } catch (err) {
    console.error("[notification-soon-poller] Failed to start:", err?.message || err);
  }
});
