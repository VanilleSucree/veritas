import { createClientFileFolder, uploadClientFile } from "../api/clientFiles";

function toZipFile(blob, fileName) {
  const baseName = String(fileName || "monitoring-report").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;
  return new File([blob], zipName, {
    type: "application/zip"
  });
}

function sanitizeFolderName(name) {
  return String(name || "Rapport")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160) || "Rapport";
}

/** @deprecated Prefer uploadReportHtmlFolderToClientVault (HTML files in a folder). */
export async function uploadReportArchiveToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file: toZipFile(blob, fileName),
    visibleToClient: Boolean(visibleToClient),
    folderId
  });
}

/**
 * Creates a vault folder and uploads each HTML report file into it.
 */
export async function uploadReportHtmlFolderToClientVault({
  files,
  folderName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  parentFolderId = null
}) {
  if (!clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  const list = Array.isArray(files) ? files.filter(row => row?.blob || row?.html) : [];
  if (!list.length) {
    throw new Error("Aucun fichier HTML à archiver.");
  }

  const folder = await createClientFileFolder({
    clientId,
    name: sanitizeFolderName(folderName),
    parentId: parentFolderId || null
  });

  const uploaded = [];
  for (const row of list) {
    const fileName = String(row.fileName || "rapport.html").replace(/[<>:"/\\|?*]+/g, " ").trim() || "rapport.html";
    const htmlName = fileName.toLowerCase().endsWith(".html") ? fileName : `${fileName}.html`;
    const blob = row.blob || new Blob([row.html || ""], { type: "text/html;charset=utf-8" });
    const file = new File([blob], htmlName, { type: "text/html" });
    const saved = await uploadClientFile({
      clientId,
      clientName,
      category: "Rapport",
      description,
      file,
      visibleToClient: Boolean(visibleToClient),
      folderId: folder.id
    });
    uploaded.push(saved);
  }

  return { folder, files: uploaded };
}

export async function uploadInterventionPdfToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  const baseName = String(fileName || "rapport-intervention").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const pdfName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
  const file = new File([blob], pdfName, {
    type: "application/pdf"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient),
    folderId
  });
}
