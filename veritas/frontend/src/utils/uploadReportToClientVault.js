import { uploadClientFile } from "../api/clientFiles";

function toZipFile(blob, fileName) {
  const baseName = String(fileName || "monitoring-report").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;
  return new File([blob], zipName, {
    type: "application/zip"
  });
}

export async function uploadReportArchiveToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false
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
    visibleToClient: Boolean(visibleToClient)
  });
}

export async function uploadInterventionPdfToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false
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
    visibleToClient: Boolean(visibleToClient)
  });
}
