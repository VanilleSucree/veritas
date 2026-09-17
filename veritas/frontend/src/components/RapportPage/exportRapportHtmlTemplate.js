export const REPORT_META = {
  supervision: {
    label: "Rapport de supervision",
    shortLabel: "Supervision"
  },
  infrastructure: {
    label: "Rapport infrastructure",
    shortLabel: "Infrastructure"
  },
  cybersecurite: {
    label: "Rapport sauvegardes",
    shortLabel: "Sauvegardes"
  },
  services: {
    label: "Rapport services",
    shortLabel: "Services"
  },
  support: {
    label: "Rapport support",
    shortLabel: "Support"
  }
};
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function formatReportDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}
export function buildReportPeriodLabel(client) {
  const startLabel = formatReportDate(client?.reportStartDate);
  const endLabel = formatReportDate(client?.reportEndDate);
  if (startLabel && endLabel) {
    return `Période du ${startLabel} au ${endLabel}`;
  }
  return "";
}
export function buildExportPrintStyles() {
  return `
    :root {
      --vex-bg: #f1f5f9;
      --vex-surface: #ffffff;
      --vex-bg-muted: #f8fafc;
      --vex-border: #e2e8f0;
      --vex-border-strong: #cbd5e1;
      --vex-text: #0f172a;
      --vex-text-muted: #64748b;
      --vex-accent: #0f766e;
      --vex-accent-dark: #115e59;
      --vex-accent-soft: #ecfdf5;
      --vex-navy: #1e3a5f;
      --vex-ok: #15803d;
      --vex-ok-soft: #dcfce7;
      --vex-warn: #b45309;
      --vex-warn-soft: #fef3c7;
      --vex-crit: #b91c1c;
      --vex-crit-soft: #fee2e2;
      --vex-max: 1120px;
      --vex-radius: 14px;
      --vex-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
    }

    * { box-sizing: border-box !important; }

    html {
      scroll-behavior: smooth;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background:
        radial-gradient(1200px 480px at 8% -10%, rgba(15, 118, 110, 0.08), transparent 55%),
        radial-gradient(900px 420px at 100% 0%, rgba(30, 58, 95, 0.07), transparent 50%),
        var(--vex-bg) !important;
      color: var(--vex-text) !important;
      font-family: "Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 15px !important;
      line-height: 1.55 !important;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    img, svg, iconify-icon {
      max-width: 100%;
    }

    a {
      color: var(--vex-accent-dark);
    }

    /* ── Shell document ── */
    .vex-shell {
      max-width: calc(var(--vex-max) + 4rem);
      margin: 1.5rem auto 2.5rem;
      padding: 0 1rem;
    }

    .vex-doc {
      background: var(--vex-surface);
      border: 1px solid var(--vex-border);
      border-radius: 18px;
      box-shadow: var(--vex-shadow);
      overflow: hidden;
    }

    /* ── En-tête export ── */
    .vex-header {
      position: relative;
      background:
        linear-gradient(135deg, #0b3d4a 0%, #115e59 42%, #0f766e 100%);
      color: #f8fafc;
      border-bottom: none;
    }
    .vex-header::after {
      content: "";
      position: absolute;
      inset: auto 0 0 0;
      height: 4px;
      background: linear-gradient(90deg, #99f6e4 0%, #5eead4 40%, #fbbf24 100%);
    }
    .vex-header-inner {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.85rem 2rem 1.65rem;
    }
    .vex-brand-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem 1rem;
      margin-bottom: 1.15rem;
    }
    .vex-brand {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #99f6e4;
      margin: 0;
    }
    .vex-company {
      margin: 0.35rem 0 0;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #ffffff;
    }
    .vex-generated {
      margin: 0;
      font-size: 0.78rem;
      color: rgba(248, 250, 252, 0.72);
    }
    .vex-client {
      margin: 0;
      font-size: clamp(1.7rem, 3.6vw, 2.35rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.15;
      color: #ffffff;
      font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
    }
    .vex-period {
      margin: 0.45rem 0 0;
      font-size: 0.98rem;
      color: rgba(248, 250, 252, 0.82);
    }
    .vex-report-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 1.05rem;
      padding: 0.38rem 0.9rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ecfdf5;
      font-size: 0.8rem;
      font-weight: 650;
      letter-spacing: 0.03em;
      backdrop-filter: blur(6px);
    }
    .vex-report-pill::before {
      content: "";
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 999px;
      background: #5eead4;
      box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.25);
    }

    /* ── Contenu rapport ── */
    .vex-main {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.75rem 2rem 2.75rem;
    }

    [data-export-hide] { display: none !important; }

    [data-export-section],
    [data-report-export] {
      display: block !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    [data-export-section] > div,
    [data-report-export] > div {
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .vex-main h1,
    .vex-main h2,
    .vex-main h3,
    .vex-main [class*="executiveTitle"],
    .vex-main [class*="summaryChapterTitle"] {
      font-family: "Source Serif 4", Georgia, "Times New Roman", serif !important;
      font-size: 1.45rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.02em !important;
      line-height: 1.25 !important;
      color: var(--vex-navy) !important;
      margin: 1.75rem 0 0.85rem !important;
      padding-bottom: 0.55rem !important;
      border-bottom: 2px solid var(--vex-border) !important;
    }

    .vex-main h1:first-child,
    .vex-main h2:first-child,
    .vex-main h3:first-child,
    .vex-main [class*="executiveTitle"]:first-child,
    .vex-main [class*="summaryChapterTitle"]:first-child {
      margin-top: 0.25rem !important;
    }

    [class*="summaryToc"] {
      margin-bottom: 1.65rem !important;
      padding: 0.95rem 1.1rem !important;
      border: 1px solid var(--vex-border) !important;
      border-radius: var(--vex-radius) !important;
      background: var(--vex-bg-muted) !important;
    }

    [class*="overviewContainer"] {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .vex-main h4,
    .vex-main [class*="sectionTitle"],
    .vex-main [class*="stepTitle"],
    .vex-main [class*="sectionHeading"],
    .vex-main [class*="tableBlockTitle"] {
      color: var(--vex-text) !important;
      font-size: 1.02rem !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em !important;
      margin: 1.35rem 0 0.65rem !important;
    }

    .vex-main p,
    .vex-main li {
      color: var(--vex-text) !important;
    }

    .vex-main [class*="sectionSubtitle"],
    .vex-main [class*="stepSubtitle"],
    .vex-main [class*="globalStatsLabel"],
    .vex-main [class*="tableBlockCount"],
    .vex-main [class*="globalStatsHint"] {
      color: var(--vex-text-muted) !important;
    }

    /* KPI / stats */
    .vex-main [class*="globalStatsGrid"],
    .vex-main [class*="globalStatsGridStylized"],
    .vex-main [class*="kpiGrid"] {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
      gap: 0.75rem !important;
      margin: 0.85rem 0 1.25rem !important;
    }

    .vex-main [class*="globalStatsItem"],
    .vex-main [class*="globalStatsGridStylized"] [class*="globalStatsItem"],
    .vex-main [class*="kpiCard"] {
      position: relative !important;
      background: var(--vex-bg-muted) !important;
      border: 1px solid var(--vex-border) !important;
      border-radius: 12px !important;
      padding: 0.9rem 1rem !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }

    .vex-main [class*="globalStatsItem"]::before,
    .vex-main [class*="kpiCard"]::before {
      content: "" !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: 3px !important;
      background: var(--vex-accent) !important;
    }

    .vex-main [class*="globalStatsValue"],
    .vex-main [class*="kpiValue"] {
      font-size: 1.45rem !important;
      font-weight: 750 !important;
      letter-spacing: -0.03em !important;
      color: var(--vex-navy) !important;
      line-height: 1.15 !important;
    }

    .vex-main [class*="globalStatsLabel"],
    .vex-main [class*="kpiLabel"] {
      font-size: 0.78rem !important;
      font-weight: 650 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }

    /* Tables */
    .vex-main [class*="infraTableWrapper"],
    .vex-main [class*="tableWrapper"],
    .vex-main [class*="tableBlock"] {
      border: 1px solid var(--vex-border) !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      background: var(--vex-surface) !important;
      margin: 0.65rem 0 1.35rem !important;
    }

    .vex-main table {
      width: 100% !important;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      border: none !important;
    }

    .vex-main [class*="infraTableHeaderCell"],
    .vex-main thead th {
      background: #eef2f7 !important;
      color: var(--vex-text-muted) !important;
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      padding: 0.7rem 0.85rem !important;
      border-bottom: 1px solid var(--vex-border-strong) !important;
      text-align: left !important;
      white-space: nowrap !important;
    }

    .vex-main [class*="infraTableCell"],
    .vex-main tbody td {
      color: var(--vex-text) !important;
      font-size: 0.86rem !important;
      padding: 0.7rem 0.85rem !important;
      border-bottom: 1px solid var(--vex-border) !important;
      vertical-align: top !important;
    }

    .vex-main tbody tr:nth-child(even) td,
    .vex-main tbody tr:nth-child(even) [class*="infraTableCell"] {
      background: #fafbfc !important;
    }

    .vex-main tbody tr:last-child td,
    .vex-main tbody tr:last-child [class*="infraTableCell"] {
      border-bottom: none !important;
    }

    /* Cards / chips */
    .vex-main [class*="topologyStorageChip"],
    .vex-main [class*="topologyServerChip"],
    .vex-main [class*="topologyFirewallChip"],
    .vex-main [class*="topologyLinkChip"],
    .vex-main [class*="card"],
    .vex-main [class*="execCard"],
    .vex-main [class*="panel"] {
      background: var(--vex-surface) !important;
      border: 1px solid var(--vex-border) !important;
      border-radius: 12px !important;
      box-shadow: none !important;
    }

    /* Status badges */
    .vex-main [class*="statusBadge"],
    .vex-main [class*="monitoringStatus"] {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.3rem !important;
      padding: 0.18rem 0.55rem !important;
      border-radius: 999px !important;
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.02em !important;
      border: 1px solid transparent !important;
    }

    .vex-main [class*="ok"],
    .vex-main [class*="success"],
    .vex-main [class*="online"] {
      color: var(--vex-ok) !important;
    }

    .vex-main [class*="warn"],
    .vex-main [class*="warning"] {
      color: var(--vex-warn) !important;
    }

    .vex-main [class*="error"],
    .vex-main [class*="critical"],
    .vex-main [class*="fail"] {
      color: var(--vex-crit) !important;
    }

    /* ── Comments ── */
    .vex-comments,
    [data-export-comments="true"] {
      margin-top: 2.25rem !important;
      padding-top: 1.35rem !important;
      border-top: 1px solid var(--vex-border) !important;
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .vex-comments-head,
    [data-export-comments="true"] [class*="reportCommentsHeader"] {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      margin-bottom: 0.95rem !important;
      color: var(--vex-navy) !important;
    }

    .vex-comments-title,
    [data-export-comments="true"] [class*="reportCommentsTitle"] {
      margin: 0 !important;
      font-size: 1.05rem !important;
      font-weight: 700 !important;
      color: var(--vex-navy) !important;
      letter-spacing: -0.01em !important;
      text-transform: none !important;
      border: none !important;
      padding: 0 !important;
      font-family: "Source Serif 4", Georgia, serif !important;
    }

    .vex-comments-list,
    [data-export-comments="true"] [class*="reportCommentsList"] {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.7rem !important;
    }

    .vex-comment-card,
    [data-export-comments="true"] [class*="reportCommentCard"] {
      border: 1px solid var(--vex-border) !important;
      border-left: 3px solid var(--vex-accent) !important;
      border-radius: 12px !important;
      background: var(--vex-bg-muted) !important;
      padding: 0.9rem 1.05rem !important;
      box-shadow: none !important;
    }

    .vex-comment-meta,
    [data-export-comments="true"] [class*="reportCommentMeta"] {
      font-size: 0.76rem !important;
      font-weight: 650 !important;
      color: var(--vex-text-muted) !important;
      margin-bottom: 0.4rem !important;
    }

    .vex-comment-body,
    [data-export-comments="true"] [class*="reportCommentBody"] {
      font-size: 0.9rem !important;
      line-height: 1.55 !important;
      color: var(--vex-text) !important;
      white-space: pre-wrap !important;
    }

    .vex-comments-empty {
      border: 1px dashed var(--vex-border-strong);
      border-radius: 12px;
      background: var(--vex-bg-muted);
      padding: 1.15rem 1.2rem;
      font-size: 0.9rem;
      color: var(--vex-text-muted);
    }

    /* ── Pied de page ── */
    .vex-footer {
      border-top: 1px solid var(--vex-border);
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      margin-top: 0;
    }
    .vex-footer-inner {
      max-width: var(--vex-max);
      margin: 0 auto;
      padding: 1.45rem 2rem 1.6rem;
      text-align: center;
    }
    .vex-footer-brand {
      font-size: 0.78rem;
      font-weight: 750;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--vex-navy);
    }
    .vex-footer-contacts {
      margin-top: 0.7rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.85rem 1.35rem;
      font-size: 0.86rem;
    }
    .vex-footer-contacts a {
      color: var(--vex-accent-dark);
      text-decoration: none;
      font-weight: 600;
    }
    .vex-footer-contacts a:hover {
      text-decoration: underline;
    }
    .vex-footer-social {
      margin-top: 0.85rem;
      display: flex;
      justify-content: center;
      gap: 0.9rem;
    }
    .vex-footer-social a {
      color: var(--vex-text-muted);
      text-decoration: none;
      display: inline-flex;
      width: 2rem;
      height: 2rem;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid var(--vex-border);
      background: #fff;
    }
    .vex-footer-note {
      margin: 0.95rem 0 0;
      font-size: 0.75rem;
      color: var(--vex-text-muted);
    }

    .vex-back-top {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--vex-border);
      background: #ffffff;
      box-shadow: var(--vex-shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vex-navy);
      font-size: 1.05rem;
      text-decoration: none;
      z-index: 20;
    }
    .vex-back-top:hover {
      border-color: var(--vex-accent);
      color: var(--vex-accent-dark);
    }

    @media (max-width: 720px) {
      .vex-shell { margin: 0; padding: 0; }
      .vex-doc { border-radius: 0; border-left: none; border-right: none; }
      .vex-header-inner,
      .vex-main,
      .vex-footer-inner { padding-left: 1.1rem; padding-right: 1.1rem; }
      .vex-main [class*="globalStatsGrid"],
      .vex-main [class*="globalStatsGridStylized"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media print {
      html, body {
        background: #fff !important;
        color: #000 !important;
      }
      .vex-shell { margin: 0; padding: 0; max-width: none; }
      .vex-doc {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .vex-back-top { display: none !important; }
      .vex-header {
        background: #115e59 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        break-after: avoid;
      }
      .vex-main [class*="globalStatsItem"],
      .vex-main thead th,
      .vex-main tbody tr:nth-child(even) td {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      section, article, table, [class*="globalStatsItem"] {
        break-inside: avoid;
      }
    }
  `;
}
export function buildExportHeaderHtml({
  clientName,
  periodLabel,
  reportType,
  branding = null
}) {
  const meta = REPORT_META[reportType] || {
    label: "Rapport de supervision"
  };
  const brandLabel = String(branding?.brandLabel || "PSI × Veritas").trim() || "PSI × Veritas";
  const companyName = String(branding?.companyName || "").trim();
  const showGeneratedAt = branding?.showGeneratedAt !== false;
  const generatedAt = new Date().toLocaleString("fr-FR");
  const companyHtml = companyName && companyName.toLowerCase() !== brandLabel.toLowerCase()
    ? `<p class="vex-company">${escapeHtml(companyName)}</p>`
    : "";
  return `
  <header class="vex-header">
    <div class="vex-header-inner">
      <div class="vex-brand-row">
        <div>
          <p class="vex-brand">${escapeHtml(brandLabel)}</p>
          ${companyHtml}
        </div>
        ${showGeneratedAt ? `<p class="vex-generated">Généré le ${escapeHtml(generatedAt)}</p>` : ""}
      </div>
      <h1 class="vex-client">${escapeHtml(clientName)}</h1>
      ${periodLabel ? `<p class="vex-period">${escapeHtml(periodLabel)}</p>` : ""}
      <span class="vex-report-pill">${escapeHtml(meta.label)}</span>
    </div>
  </header>`;
}
export function buildExportFooterHtml(branding = null) {
  const brandLabel = String(branding?.brandLabel || "PSI × Veritas").trim() || "PSI × Veritas";
  const companyName = String(branding?.companyName || "").trim();
  const supportEmail = String(branding?.supportEmail || "").trim();
  const supportPhone = String(branding?.supportPhone || "").trim();
  const website = String(branding?.website || "").trim();
  const address = String(branding?.address || "").trim();
  const footerNote = String(branding?.footerNote || "Confidentiel — usage client").trim();
  const showGeneratedAt = branding?.showGeneratedAt !== false;
  const socials = Array.isArray(branding?.socials) ? branding.socials : [];
  const generatedAt = new Date().toLocaleString("fr-FR");

  const contactParts = [];
  if (supportEmail) {
    contactParts.push(`<a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>`);
  }
  if (supportPhone) {
    const telHref = supportPhone.replace(/[^\d+]/g, "");
    contactParts.push(`<a href="tel:${escapeHtml(telHref)}">${escapeHtml(supportPhone)}</a>`);
  }
  if (website) {
    contactParts.push(`<a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">${escapeHtml(website.replace(/^https?:\/\//i, ""))}</a>`);
  }
  if (address) {
    contactParts.push(`<span>${escapeHtml(address)}</span>`);
  }

  const socialHtml = socials.length
    ? `<div class="vex-footer-social">${socials.map(item => `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(item.title || "")}">
          <iconify-icon icon="${escapeHtml(item.icon || "mdi:link")}" width="18" height="18"></iconify-icon>
        </a>`).join("")}
      </div>`
    : "";

  const noteParts = [];
  if (showGeneratedAt) noteParts.push(`Document généré le ${escapeHtml(generatedAt)}`);
  if (footerNote) noteParts.push(escapeHtml(footerNote));
  const footerBrand = companyName || brandLabel;

  return `
  <footer class="vex-footer">
    <div class="vex-footer-inner">
      <div class="vex-footer-brand">${escapeHtml(footerBrand)}</div>
      ${brandLabel && companyName && brandLabel.toLowerCase() !== companyName.toLowerCase()
        ? `<div class="vex-footer-brand" style="margin-top:0.35rem;font-size:0.7rem;letter-spacing:0.12em;opacity:0.75">${escapeHtml(brandLabel)}</div>`
        : ""}
      ${contactParts.length ? `<div class="vex-footer-contacts">${contactParts.join("")}</div>` : ""}
      ${socialHtml}
      ${noteParts.length ? `<p class="vex-footer-note">${noteParts.join(" · ")}</p>` : ""}
    </div>
  </footer>`;
}
export function buildExportCommentsEmptyHtml() {
  return `
  <section class="vex-comments" data-export-comments="true">
    <div class="vex-comments-head">
      <iconify-icon icon="mdi:comment-text-multiple-outline" width="20" height="20"></iconify-icon>
      <h2 class="vex-comments-title">Notes du rapport</h2>
    </div>
    <div class="vex-comments-empty">Aucune note ajoutée pour cette période.</div>
  </section>`;
}
export function buildReportDocumentHtml({
  documentTitle,
  collectedCss = "",
  bodyContent,
  commentsHtml = "",
  branding = null
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet" />
  <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
  <style>
    ${collectedCss}
    ${buildExportPrintStyles()}
  </style>
</head>
<body id="top">
  <div class="vex-shell">
    <div class="vex-doc">
      ${bodyContent}
      ${commentsHtml || ""}
      ${buildExportFooterHtml(branding)}
    </div>
  </div>
  <a href="#top" class="vex-back-top" aria-label="Remonter en haut de page">↑</a>
</body>
</html>`;
}
