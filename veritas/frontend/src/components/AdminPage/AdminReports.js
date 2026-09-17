import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchReportBrandingAdmin, updateReportBranding } from "../../api/reportBranding";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { createLocaleGetter } from "../../i18n/translate";
import { Page, Card, Field, Input, Textarea, Btn, FormGrid, Switch } from "./AdminUi";

const EMPTY = {
  report_company_name: "",
  report_brand_label: "PSI × Veritas",
  report_support_email: "",
  report_support_phone: "",
  report_website: "",
  report_address: "",
  report_footer_note: "Confidentiel — usage client",
  report_social_linkedin: "",
  report_social_linkedin_alt: "",
  report_social_facebook: "",
  report_social_x: "",
  report_social_youtube: "",
  report_show_generated_at: "true"
};

const COPY = {
  fr: {
    title: "Rapports",
    subtitle: "Identité affichée dans les en-têtes et pieds de page des rapports HTML (supervision, sauvegardes, services).",
    identity: "Identité",
    identityHint: "Si un champ est vide, Veritas reprend les paramètres généraux de l’organisation quand c’est possible.",
    companyName: "Nom de la société",
    companyNameHint: "Affiché dans l’en-tête du rapport (sinon nom d’organisation général).",
    brandLabel: "Marque / signature",
    brandLabelHint: "Petite ligne type « PSI × Veritas » en haut et en bas du document.",
    contact: "Coordonnées",
    supportEmail: "E-mail support",
    supportPhone: "Téléphone",
    website: "Site web",
    address: "Adresse",
    socials: "Réseaux sociaux",
    socialsHint: "Seules les URLs renseignées apparaissent dans le pied de page.",
    linkedin: "LinkedIn",
    linkedinAlt: "LinkedIn (secondaire)",
    facebook: "Facebook",
    x: "X (Twitter)",
    youtube: "YouTube",
    footer: "Pied de page",
    footerNote: "Mention légale / note",
    showGeneratedAt: "Afficher la date de génération",
    preview: "Aperçu résolu",
    previewEmpty: "—",
    save: "Enregistrer",
    saving: "Enregistrement…",
    loadError: "Impossible de charger les paramètres rapports.",
    saveSuccess: "Paramètres rapports enregistrés.",
    saveError: "Enregistrement impossible.",
    communityLocked: "Fonctionnalité Pro",
    communityHint: "La personnalisation des rapports (identité, contacts, réseaux sociaux) est réservée à l’édition Pro."
  },
  en: {
    title: "Reports",
    subtitle: "Identity shown in HTML report headers and footers (supervision, backups, services).",
    identity: "Identity",
    identityHint: "Empty fields fall back to general organization settings when available.",
    companyName: "Company name",
    companyNameHint: "Shown in the report header (falls back to general organization name).",
    brandLabel: "Brand / signature",
    brandLabelHint: "Small line such as “PSI × Veritas” at the top and bottom.",
    contact: "Contact details",
    supportEmail: "Support email",
    supportPhone: "Phone",
    website: "Website",
    address: "Address",
    socials: "Social networks",
    socialsHint: "Only filled URLs appear in the footer.",
    linkedin: "LinkedIn",
    linkedinAlt: "LinkedIn (secondary)",
    facebook: "Facebook",
    x: "X (Twitter)",
    youtube: "YouTube",
    footer: "Footer",
    footerNote: "Legal / footer note",
    showGeneratedAt: "Show generation date",
    preview: "Resolved preview",
    previewEmpty: "—",
    save: "Save",
    saving: "Saving…",
    loadError: "Unable to load report settings.",
    saveSuccess: "Report settings saved.",
    saveError: "Unable to save.",
    communityLocked: "Pro feature",
    communityHint: "Report branding (identity, contacts, social networks) is available in the Pro edition."
  }
};

const getCopy = createLocaleGetter(COPY);

export default function AdminReports({ isCommunity = false }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (isCommunity) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchReportBrandingAdmin()
      .then(data => {
        if (cancelled) return;
        setForm({ ...EMPTY, ...(data.settings || {}) });
        setPreview(data.branding || null);
      })
      .catch(() => {
        if (!cancelled) toast.error(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError, isCommunity]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateReportBranding(form);
      setForm({ ...EMPTY, ...(data.settings || {}) });
      setPreview(data.branding || null);
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (isCommunity) {
    return (
      <Page>
        <Card title={copy.title} description={copy.communityLocked}>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--msp-muted, #5c6b82)" }}>{copy.communityHint}</p>
        </Card>
      </Page>
    );
  }

  const saveBtn = (
    <Btn icon="mdi:content-save-outline" disabled={loading || saving} onClick={handleSave}>
      {saving ? copy.saving : copy.save}
    </Btn>
  );

  return (
    <Page>
      <Card title={copy.title} description={copy.subtitle} action={saveBtn}>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--msp-muted, #5c6b82)" }}>{copy.identityHint}</p>
      </Card>

      <Card title={copy.identity}>
        <FormGrid>
          <Field label={copy.companyName} hint={copy.companyNameHint}>
            <Input
              value={form.report_company_name}
              onChange={e => setField("report_company_name", e.target.value)}
              placeholder={preview?.companyName || "Veritas"}
              maxLength={120}
              disabled={loading || saving}
            />
          </Field>
          <Field label={copy.brandLabel} hint={copy.brandLabelHint}>
            <Input
              value={form.report_brand_label}
              onChange={e => setField("report_brand_label", e.target.value)}
              placeholder="PSI × Veritas"
              maxLength={80}
              disabled={loading || saving}
            />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.contact}>
        <FormGrid>
          <Field label={copy.supportEmail}>
            <Input
              type="email"
              value={form.report_support_email}
              onChange={e => setField("report_support_email", e.target.value)}
              placeholder="support@exemple.fr"
              maxLength={200}
              disabled={loading || saving}
            />
          </Field>
          <Field label={copy.supportPhone}>
            <Input
              value={form.report_support_phone}
              onChange={e => setField("report_support_phone", e.target.value)}
              placeholder="09 00 00 00 00"
              maxLength={40}
              disabled={loading || saving}
            />
          </Field>
          <Field label={copy.website}>
            <Input
              type="url"
              value={form.report_website}
              onChange={e => setField("report_website", e.target.value)}
              placeholder="https://www.exemple.fr"
              maxLength={200}
              disabled={loading || saving}
            />
          </Field>
          <Field label={copy.address}>
            <Input
              value={form.report_address}
              onChange={e => setField("report_address", e.target.value)}
              placeholder="10 rue Example, 33000 Bordeaux"
              maxLength={300}
              disabled={loading || saving}
            />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.socials} description={copy.socialsHint}>
        <FormGrid>
          <Field label={copy.linkedin}>
            <Input type="url" value={form.report_social_linkedin} onChange={e => setField("report_social_linkedin", e.target.value)} placeholder="https://www.linkedin.com/company/…" disabled={loading || saving} />
          </Field>
          <Field label={copy.linkedinAlt}>
            <Input type="url" value={form.report_social_linkedin_alt} onChange={e => setField("report_social_linkedin_alt", e.target.value)} placeholder="https://www.linkedin.com/showcase/…" disabled={loading || saving} />
          </Field>
          <Field label={copy.facebook}>
            <Input type="url" value={form.report_social_facebook} onChange={e => setField("report_social_facebook", e.target.value)} placeholder="https://www.facebook.com/…" disabled={loading || saving} />
          </Field>
          <Field label={copy.x}>
            <Input type="url" value={form.report_social_x} onChange={e => setField("report_social_x", e.target.value)} placeholder="https://x.com/…" disabled={loading || saving} />
          </Field>
          <Field label={copy.youtube}>
            <Input type="url" value={form.report_social_youtube} onChange={e => setField("report_social_youtube", e.target.value)} placeholder="https://www.youtube.com/…" disabled={loading || saving} />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.footer}>
        <FormGrid>
          <Field label={copy.footerNote}>
            <Textarea
              value={form.report_footer_note}
              onChange={e => setField("report_footer_note", e.target.value)}
              rows={2}
              maxLength={200}
              disabled={loading || saving}
            />
          </Field>
          <Field label={copy.showGeneratedAt}>
            <Switch
              checked={String(form.report_show_generated_at).toLowerCase() === "true"}
              onChange={on => setField("report_show_generated_at", on ? "true" : "false")}
              disabled={loading || saving}
            />
          </Field>
        </FormGrid>
      </Card>

      {preview ? (
        <Card title={copy.preview} action={saveBtn}>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.88rem", color: "var(--msp-muted, #5c6b82)" }}>
            <div><strong>{copy.companyName}:</strong> {preview.companyName || copy.previewEmpty}</div>
            <div><strong>{copy.brandLabel}:</strong> {preview.brandLabel || copy.previewEmpty}</div>
            <div><strong>{copy.supportEmail}:</strong> {preview.supportEmail || copy.previewEmpty}</div>
            <div><strong>{copy.supportPhone}:</strong> {preview.supportPhone || copy.previewEmpty}</div>
            <div><strong>{copy.website}:</strong> {preview.website || copy.previewEmpty}</div>
            <div><strong>{copy.socials}:</strong> {preview.socials?.length ? preview.socials.map(s => s.title).join(", ") : copy.previewEmpty}</div>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
