import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchReportBranding } from "../../api/reportBranding";
import { REPORT_META, buildExportHeaderHtml, buildReportDocumentHtml, buildReportPeriodLabel } from "./exportRapportHtmlTemplate";

const MAX_COLLECTED_CSS_CHARS = 350_000;

function collectDocumentCSS() {
  let css = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of sheet.cssRules) {
          const text = rule.cssText || "";
          if (!text || text.length > 8_000) continue;
          css += `${text}\n`;
          if (css.length >= MAX_COLLECTED_CSS_CHARS) return css;
        }
      } catch {
        /* Cross-origin stylesheets are not readable. */
      }
    }
  } catch (e) {
    console.warn("Report export: CSS collection", e);
  }
  return css;
}

function stripExportHidden(node) {
  if (!node || typeof node.querySelectorAll !== "function") return node;
  node.querySelectorAll("[data-export-hide]").forEach(el => el.remove());
  return node;
}

function formatZipDate(d) {
  try {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return "";
  }
}

const REPORT_EXPORT_META = {
  supervision: {
    key: "supervision",
    fileLabel: "Rapport de supervision",
    metaKey: "supervision"
  },
  sauvegarde: {
    key: "sauvegarde",
    fileLabel: "Rapport sauvegardes",
    metaKey: "cybersecurite"
  },
  services: {
    key: "services",
    fileLabel: "Rapport services",
    metaKey: "services"
  }
};

function buildSingleReportHtml({ clone, clientName, periodLabel, reportKey, collectedCss, branding }) {
  const meta = REPORT_EXPORT_META[reportKey] || REPORT_EXPORT_META.supervision;
  const reportMeta = REPORT_META[meta.metaKey] || REPORT_META.supervision;
  const title = clone?.getAttribute?.("data-report-title") || meta.fileLabel;
  const headerHtml = buildExportHeaderHtml({
    clientName,
    periodLabel,
    reportType: meta.metaKey,
    branding
  });
  const bodyContent = `
  ${headerHtml}
  <main class="vex-main">
    ${clone.outerHTML}
  </main>`;
  return {
    fileLabel: title || reportMeta.label || meta.fileLabel,
    html: buildReportDocumentHtml({
      documentTitle: `${clientName} - ${title || reportMeta.label}`,
      collectedCss,
      bodyContent,
      branding
    })
  };
}

async function resolveReportBranding() {
  try {
    return (await fetchReportBranding()) || null;
  } catch (err) {
    console.warn("Report export: branding unavailable", err);
    return null;
  }
}

function collectReportParts(root, { clientName, periodLabel, collectedCss, branding }) {
  const parts = Array.from(root.querySelectorAll("[data-report-export]"));
  if (!parts.length) {
    return [
      buildSingleReportHtml({
        clone: stripExportHidden(root.cloneNode(true)),
        clientName,
        periodLabel,
        reportKey: "supervision",
        collectedCss,
        branding
      })
    ];
  }
  return parts.map(part => {
    const clone = stripExportHidden(part.cloneNode(true));
    if (clone.style) {
      clone.style.setProperty("display", "block", "important");
      clone.style.removeProperty("visibility");
    }
    clone.removeAttribute?.("aria-hidden");
    Array.from(clone.classList || []).forEach(cls => {
      if (/hidden/i.test(cls)) clone.classList.remove(cls);
    });
    return buildSingleReportHtml({
      clone,
      clientName,
      periodLabel,
      reportKey: part.getAttribute("data-report-export") || "supervision",
      collectedCss,
      branding
    });
  });
}

export async function buildReportZipBlob(ref, config) {
  if (!ref?.current) {
    throw new Error("Contenu de synthèse indisponible. Ouvrez l’étape Synthèse, puis réessayez.");
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }
  const root = ref.current;
  const collectedCss = collectDocumentCSS();
  const clientName = config.client.name || config.client.nom || "CLIENT";
  const periodLabel = buildReportPeriodLabel(config.client);
  const safeName = String(clientName).replace(/\s+/g, " ").trim() || "CLIENT";
  const branding = await resolveReportBranding();

  const zip = new JSZip();
  const reports = collectReportParts(root, { clientName, periodLabel, collectedCss, branding });

  reports.forEach(report => {
    const safeLabel = String(report.fileLabel || "Rapport").replace(/[<>:"/\\|?*]+/g, " ").trim();
    zip.file(`${safeName} - ${safeLabel}.html`, report.html);
  });

  const start = config.client.reportStartDate;
  const end = config.client.reportEndDate;
  let zipFileName = "Rapport de supervision";
  if (start && end) {
    zipFileName = `Rapport supervision ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  return {
    blob,
    fileName: `${zipFileName}.zip`
  };
}

/**
 * Builds the three (or N) independent HTML report files without zipping.
 */
export async function buildReportHtmlParts(ref, config) {
  if (!ref?.current) {
    throw new Error("Contenu de synthèse indisponible. Ouvrez l’étape Synthèse, puis réessayez.");
  }
  if (!config?.client) {
    throw new Error("Configuration client manquante.");
  }
  const root = ref.current;
  const collectedCss = collectDocumentCSS();
  const clientName = config.client.name || config.client.nom || "CLIENT";
  const periodLabel = buildReportPeriodLabel(config.client);
  const safeName = String(clientName).replace(/\s+/g, " ").trim() || "CLIENT";
  const branding = await resolveReportBranding();

  const reports = collectReportParts(root, { clientName, periodLabel, collectedCss, branding });

  const start = config.client.reportStartDate;
  const end = config.client.reportEndDate;
  let folderLabel = "Rapport de supervision";
  if (start && end) {
    folderLabel = `Rapport supervision ${formatZipDate(start)} - ${formatZipDate(end)}`;
  }

  return {
    folderLabel,
    files: reports.map(report => {
      const safeLabel = String(report.fileLabel || "Rapport").replace(/[<>:"/\\|?*]+/g, " ").trim() || "Rapport";
      const fileName = `${safeName} - ${safeLabel}.html`;
      const html = report.html || "";
      return {
        fileName,
        html,
        blob: new Blob([html], { type: "text/html;charset=utf-8" })
      };
    })
  };
}

export async function exportReportAsZIP(ref, config) {
  const { blob, fileName } = await buildReportZipBlob(ref, config);
  saveAs(blob, fileName);
}
