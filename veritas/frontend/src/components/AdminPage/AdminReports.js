import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchReportBrandingAdmin, updateReportBranding } from "../../api/reportBranding";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { createLocaleGetter } from "../../i18n/translate";
import { Page, Card, Field, Input, Textarea, Btn, FormGrid, Switch, Select } from "./AdminUi";

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
  report_show_generated_at: "true",
  report_font_sans: "source_sans",
  report_font_serif: "source_serif",
  report_header_bg: "#0b3d4a",
  report_header_bg_end: "#0f766e",
  report_header_text: "#f8fafc",
  report_header_brand_color: "#99f6e4",
  report_header_accent_bar: "#99f6e4",
  report_header_accent_bar_end: "#fbbf24",
  report_footer_bg: "#ffffff",
  report_footer_text: "#1e3a5f",
  report_footer_muted: "#64748b",
  report_footer_link: "#115e59",
  report_accent: "#0f766e",
  report_navy: "#1e3a5f",
  report_brand_size: "0.72",
  report_company_size: "1.05",
  report_client_size: "2.1",
  report_footer_brand_size: "0.95",
  report_footer_note_size: "0.78"
};

const DEFAULT_FONT_PRESETS = {
  sans: [
    { id: "source_sans", label: "Source Sans 3" },
    { id: "inter", label: "Inter" },
    { id: "ibm_plex", label: "IBM Plex Sans" },
    { id: "nunito", label: "Nunito Sans" },
    { id: "system", label: "Système" }
  ],
  serif: [
    { id: "source_serif", label: "Source Serif 4" },
    { id: "libre_baskerville", label: "Libre Baskerville" },
    { id: "merriweather", label: "Merriweather" },
    { id: "georgia", label: "Georgia" }
  ]
};

const FONT_STACKS = {
  source_sans: '"Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  inter: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  ibm_plex: '"IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  nunito: '"Nunito Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  source_serif: '"Source Serif 4", Georgia, "Times New Roman", serif',
  libre_baskerville: '"Libre Baskerville", Georgia, "Times New Roman", serif',
  merriweather: 'Merriweather, Georgia, "Times New Roman", serif',
  georgia: 'Georgia, "Times New Roman", Times, serif'
};

const COPY = {
  fr: {
    title: "Rapports",
    subtitle: "Identité et apparence des en-têtes / pieds de page des rapports HTML (supervision, sauvegardes, services).",
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
    appearance: "Apparence",
    appearanceHint: "Polices, couleurs et tailles appliquées à l’en-tête et au pied de page des exports HTML.",
    fonts: "Polices",
    fontSans: "Police du corps / footer",
    fontSerif: "Police des titres (header client)",
    headerColors: "Couleurs de l’en-tête",
    headerBg: "Fond (début)",
    headerBgEnd: "Fond (fin)",
    headerText: "Texte",
    headerBrandColor: "Marque / signature",
    headerAccentBar: "Barre d’accent (début)",
    headerAccentBarEnd: "Barre d’accent (fin)",
    footerColors: "Couleurs du pied de page",
    footerBg: "Fond",
    footerText: "Titre / marque",
    footerMuted: "Texte secondaire",
    footerLink: "Liens",
    themeColors: "Couleurs du document",
    accent: "Accent",
    navy: "Titres / navy",
    sizes: "Tailles (rem)",
    brandSize: "Signature header",
    companySize: "Nom société header",
    clientSize: "Nom client (titre)",
    footerBrandSize: "Marque footer",
    footerNoteSize: "Note footer",
    resetAppearance: "Réinitialiser l’apparence",
    livePreview: "Aperçu en direct",
    previewClient: "Entreprise exemple",
    previewPeriod: "Période du 01/01/2026 au 31/01/2026",
    previewPill: "Rapport de supervision",
    preview: "Aperçu résolu",
    previewEmpty: "—",
    save: "Enregistrer",
    saving: "Enregistrement…",
    loadError: "Impossible de charger les paramètres rapports.",
    saveSuccess: "Paramètres rapports enregistrés.",
    saveError: "Enregistrement impossible.",
    communityLocked: "Fonctionnalité Pro",
    communityHint: "La personnalisation des rapports (identité, contacts, réseaux sociaux, apparence) est réservée à l’édition Pro."
  },
  en: {
    title: "Reports",
    subtitle: "Identity and look of HTML report headers / footers (supervision, backups, services).",
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
    appearance: "Appearance",
    appearanceHint: "Fonts, colors and sizes applied to HTML export header and footer.",
    fonts: "Fonts",
    fontSans: "Body / footer font",
    fontSerif: "Title font (client header)",
    headerColors: "Header colors",
    headerBg: "Background (start)",
    headerBgEnd: "Background (end)",
    headerText: "Text",
    headerBrandColor: "Brand / signature",
    headerAccentBar: "Accent bar (start)",
    headerAccentBarEnd: "Accent bar (end)",
    footerColors: "Footer colors",
    footerBg: "Background",
    footerText: "Brand / title",
    footerMuted: "Muted text",
    footerLink: "Links",
    themeColors: "Document colors",
    accent: "Accent",
    navy: "Titles / navy",
    sizes: "Sizes (rem)",
    brandSize: "Header signature",
    companySize: "Header company name",
    clientSize: "Client title",
    footerBrandSize: "Footer brand",
    footerNoteSize: "Footer note",
    resetAppearance: "Reset appearance",
    livePreview: "Live preview",
    previewClient: "Sample company",
    previewPeriod: "Period from 01/01/2026 to 31/01/2026",
    previewPill: "Supervision report",
    preview: "Resolved preview",
    previewEmpty: "—",
    save: "Save",
    saving: "Saving…",
    loadError: "Unable to load report settings.",
    saveSuccess: "Report settings saved.",
    saveError: "Unable to save.",
    communityLocked: "Pro feature",
    communityHint: "Report branding (identity, contacts, social networks, appearance) is available in the Pro edition."
  }
};

const getCopy = createLocaleGetter(COPY);

const APPEARANCE_KEYS = [
  "report_font_sans",
  "report_font_serif",
  "report_header_bg",
  "report_header_bg_end",
  "report_header_text",
  "report_header_brand_color",
  "report_header_accent_bar",
  "report_header_accent_bar_end",
  "report_footer_bg",
  "report_footer_text",
  "report_footer_muted",
  "report_footer_link",
  "report_accent",
  "report_navy",
  "report_brand_size",
  "report_company_size",
  "report_client_size",
  "report_footer_brand_size",
  "report_footer_note_size"
];

function ColorField({ label, value, onChange, disabled }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? String(value) : "#000000";
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="color"
          value={hex}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          style={{
            width: 42,
            height: 36,
            padding: 0,
            border: "1px solid var(--msp-border-light, #e2e8f0)",
            borderRadius: 8,
            background: "transparent",
            cursor: disabled ? "default" : "pointer"
          }}
        />
        <Input
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          disabled={disabled}
          style={{ flex: 1 }}
        />
      </div>
    </Field>
  );
}

function LivePreview({ form, preview, copy }) {
  const brand = form.report_brand_label || "PSI × Veritas";
  const company = preview?.companyName || form.report_company_name || "Veritas";
  const footerBrand = company || brand;
  const footerNote = form.report_footer_note || "";
  const fontSans = FONT_STACKS[form.report_font_sans] || FONT_STACKS.source_sans;
  const fontSerif = FONT_STACKS[form.report_font_serif] || FONT_STACKS.source_serif;
  const headerBg = form.report_header_bg || EMPTY.report_header_bg;
  const headerBgEnd = form.report_header_bg_end || EMPTY.report_header_bg_end;
  const headerText = form.report_header_text || EMPTY.report_header_text;
  const headerBrand = form.report_header_brand_color || EMPTY.report_header_brand_color;
  const barStart = form.report_header_accent_bar || EMPTY.report_header_accent_bar;
  const barEnd = form.report_header_accent_bar_end || EMPTY.report_header_accent_bar_end;
  const footerBg = form.report_footer_bg || EMPTY.report_footer_bg;
  const footerText = form.report_footer_text || EMPTY.report_footer_text;
  const footerMuted = form.report_footer_muted || EMPTY.report_footer_muted;
  const footerLink = form.report_footer_link || EMPTY.report_footer_link;

  return (
    <div style={{ border: "1px solid var(--msp-border-light, #e2e8f0)", borderRadius: 14, overflow: "hidden" }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${headerBg} 0%, ${headerBgEnd} 100%)`,
          color: headerText,
          padding: "1.25rem 1.35rem 1.1rem",
          position: "relative",
          fontFamily: fontSans
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            background: `linear-gradient(90deg, ${barStart}, ${barEnd})`
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div>
            <div
              style={{
                fontSize: `${form.report_brand_size || 0.72}rem`,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: headerBrand
              }}
            >
              {brand}
            </div>
            {company && company.toLowerCase() !== brand.toLowerCase() ? (
              <div style={{ marginTop: 4, fontSize: `${form.report_company_size || 1.05}rem`, fontWeight: 600 }}>{company}</div>
            ) : null}
          </div>
          {String(form.report_show_generated_at).toLowerCase() === "true" ? (
            <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>Généré le …</div>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: fontSerif,
            fontSize: `${form.report_client_size || 2.1}rem`,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em"
          }}
        >
          {copy.previewClient}
        </div>
        <div style={{ marginTop: 6, fontSize: "0.9rem", opacity: 0.85 }}>{copy.previewPeriod}</div>
        <span
          style={{
            display: "inline-flex",
            marginTop: 12,
            padding: "0.3rem 0.75rem",
            borderRadius: 999,
            border: `1px solid color-mix(in srgb, ${headerText} 22%, transparent)`,
            background: `color-mix(in srgb, ${headerText} 12%, transparent)`,
            fontSize: "0.75rem",
            fontWeight: 650
          }}
        >
          {copy.previewPill}
        </span>
      </div>
      <div
        style={{
          background: footerBg,
          color: footerText,
          padding: "1.1rem 1.2rem 1.2rem",
          textAlign: "center",
          fontFamily: fontSans,
          borderTop: "1px solid var(--msp-border-light, #e2e8f0)"
        }}
      >
        <div
          style={{
            fontSize: `${form.report_footer_brand_size || 0.95}rem`,
            fontWeight: 750,
            letterSpacing: "0.14em",
            textTransform: "uppercase"
          }}
        >
          {footerBrand}
        </div>
        <div style={{ marginTop: 8, fontSize: "0.82rem", color: footerLink }}>
          {preview?.supportEmail || form.report_support_email || "support@exemple.fr"}
        </div>
        {footerNote ? (
          <div style={{ marginTop: 10, fontSize: `${form.report_footer_note_size || 0.78}rem`, color: footerMuted }}>
            {footerNote}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminReports({ isCommunity = false }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [fontPresets, setFontPresets] = useState(DEFAULT_FONT_PRESETS);
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
        if (data.fontPresets?.sans?.length) {
          setFontPresets({
            sans: data.fontPresets.sans,
            serif: data.fontPresets.serif || DEFAULT_FONT_PRESETS.serif
          });
        }
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

  const resetAppearance = () => {
    setForm(prev => {
      const next = { ...prev };
      APPEARANCE_KEYS.forEach(key => {
        next[key] = EMPTY[key];
      });
      return next;
    });
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

  const disabled = loading || saving;

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
              disabled={disabled}
            />
          </Field>
          <Field label={copy.brandLabel} hint={copy.brandLabelHint}>
            <Input
              value={form.report_brand_label}
              onChange={e => setField("report_brand_label", e.target.value)}
              placeholder="PSI × Veritas"
              maxLength={80}
              disabled={disabled}
            />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.contact}>
        <FormGrid>
          <Field label={copy.supportEmail}>
            <Input type="email" value={form.report_support_email} onChange={e => setField("report_support_email", e.target.value)} placeholder="support@exemple.fr" maxLength={200} disabled={disabled} />
          </Field>
          <Field label={copy.supportPhone}>
            <Input value={form.report_support_phone} onChange={e => setField("report_support_phone", e.target.value)} placeholder="09 00 00 00 00" maxLength={40} disabled={disabled} />
          </Field>
          <Field label={copy.website}>
            <Input type="url" value={form.report_website} onChange={e => setField("report_website", e.target.value)} placeholder="https://www.exemple.fr" maxLength={200} disabled={disabled} />
          </Field>
          <Field label={copy.address}>
            <Input value={form.report_address} onChange={e => setField("report_address", e.target.value)} placeholder="10 rue Example, 33000 Bordeaux" maxLength={300} disabled={disabled} />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.socials} description={copy.socialsHint}>
        <FormGrid>
          <Field label={copy.linkedin}>
            <Input type="url" value={form.report_social_linkedin} onChange={e => setField("report_social_linkedin", e.target.value)} placeholder="https://www.linkedin.com/company/…" disabled={disabled} />
          </Field>
          <Field label={copy.linkedinAlt}>
            <Input type="url" value={form.report_social_linkedin_alt} onChange={e => setField("report_social_linkedin_alt", e.target.value)} placeholder="https://www.linkedin.com/showcase/…" disabled={disabled} />
          </Field>
          <Field label={copy.facebook}>
            <Input type="url" value={form.report_social_facebook} onChange={e => setField("report_social_facebook", e.target.value)} placeholder="https://www.facebook.com/…" disabled={disabled} />
          </Field>
          <Field label={copy.x}>
            <Input type="url" value={form.report_social_x} onChange={e => setField("report_social_x", e.target.value)} placeholder="https://x.com/…" disabled={disabled} />
          </Field>
          <Field label={copy.youtube}>
            <Input type="url" value={form.report_social_youtube} onChange={e => setField("report_social_youtube", e.target.value)} placeholder="https://www.youtube.com/…" disabled={disabled} />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.footer}>
        <FormGrid>
          <Field label={copy.footerNote}>
            <Textarea value={form.report_footer_note} onChange={e => setField("report_footer_note", e.target.value)} rows={2} maxLength={200} disabled={disabled} />
          </Field>
          <Field label={copy.showGeneratedAt}>
            <Switch checked={String(form.report_show_generated_at).toLowerCase() === "true"} onChange={on => setField("report_show_generated_at", on ? "true" : "false")} disabled={disabled} />
          </Field>
        </FormGrid>
      </Card>

      <Card
        title={copy.appearance}
        description={copy.appearanceHint}
        action={
          <Btn variant="ghost" icon="mdi:restore" disabled={disabled} onClick={resetAppearance}>
            {copy.resetAppearance}
          </Btn>
        }
      >
        <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.92rem" }}>{copy.fonts}</h3>
        <FormGrid>
          <Field label={copy.fontSans}>
            <Select value={form.report_font_sans} onChange={e => setField("report_font_sans", e.target.value)} disabled={disabled}>
              {fontPresets.sans.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={copy.fontSerif}>
            <Select value={form.report_font_serif} onChange={e => setField("report_font_serif", e.target.value)} disabled={disabled}>
              {fontPresets.serif.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.headerColors}</h3>
        <FormGrid>
          <ColorField label={copy.headerBg} value={form.report_header_bg} onChange={v => setField("report_header_bg", v)} disabled={disabled} />
          <ColorField label={copy.headerBgEnd} value={form.report_header_bg_end} onChange={v => setField("report_header_bg_end", v)} disabled={disabled} />
          <ColorField label={copy.headerText} value={form.report_header_text} onChange={v => setField("report_header_text", v)} disabled={disabled} />
          <ColorField label={copy.headerBrandColor} value={form.report_header_brand_color} onChange={v => setField("report_header_brand_color", v)} disabled={disabled} />
          <ColorField label={copy.headerAccentBar} value={form.report_header_accent_bar} onChange={v => setField("report_header_accent_bar", v)} disabled={disabled} />
          <ColorField label={copy.headerAccentBarEnd} value={form.report_header_accent_bar_end} onChange={v => setField("report_header_accent_bar_end", v)} disabled={disabled} />
        </FormGrid>

        <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.footerColors}</h3>
        <FormGrid>
          <ColorField label={copy.footerBg} value={form.report_footer_bg} onChange={v => setField("report_footer_bg", v)} disabled={disabled} />
          <ColorField label={copy.footerText} value={form.report_footer_text} onChange={v => setField("report_footer_text", v)} disabled={disabled} />
          <ColorField label={copy.footerMuted} value={form.report_footer_muted} onChange={v => setField("report_footer_muted", v)} disabled={disabled} />
          <ColorField label={copy.footerLink} value={form.report_footer_link} onChange={v => setField("report_footer_link", v)} disabled={disabled} />
        </FormGrid>

        <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.themeColors}</h3>
        <FormGrid>
          <ColorField label={copy.accent} value={form.report_accent} onChange={v => setField("report_accent", v)} disabled={disabled} />
          <ColorField label={copy.navy} value={form.report_navy} onChange={v => setField("report_navy", v)} disabled={disabled} />
        </FormGrid>

        <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.sizes}</h3>
        <FormGrid>
          <Field label={copy.brandSize}>
            <Input type="number" step="0.01" min="0.5" max="1.4" value={form.report_brand_size} onChange={e => setField("report_brand_size", e.target.value)} disabled={disabled} />
          </Field>
          <Field label={copy.companySize}>
            <Input type="number" step="0.01" min="0.75" max="2" value={form.report_company_size} onChange={e => setField("report_company_size", e.target.value)} disabled={disabled} />
          </Field>
          <Field label={copy.clientSize}>
            <Input type="number" step="0.05" min="1.2" max="3.5" value={form.report_client_size} onChange={e => setField("report_client_size", e.target.value)} disabled={disabled} />
          </Field>
          <Field label={copy.footerBrandSize}>
            <Input type="number" step="0.01" min="0.6" max="1.8" value={form.report_footer_brand_size} onChange={e => setField("report_footer_brand_size", e.target.value)} disabled={disabled} />
          </Field>
          <Field label={copy.footerNoteSize}>
            <Input type="number" step="0.01" min="0.55" max="1.2" value={form.report_footer_note_size} onChange={e => setField("report_footer_note_size", e.target.value)} disabled={disabled} />
          </Field>
        </FormGrid>
      </Card>

      <Card title={copy.livePreview} action={saveBtn}>
        <LivePreview form={form} preview={preview} copy={copy} />
      </Card>

      {preview ? (
        <Card title={copy.preview}>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.88rem", color: "var(--msp-muted, #5c6b82)" }}>
            <div>
              <strong>{copy.companyName}:</strong> {preview.companyName || copy.previewEmpty}
            </div>
            <div>
              <strong>{copy.brandLabel}:</strong> {preview.brandLabel || copy.previewEmpty}
            </div>
            <div>
              <strong>{copy.supportEmail}:</strong> {preview.supportEmail || copy.previewEmpty}
            </div>
            <div>
              <strong>{copy.supportPhone}:</strong> {preview.supportPhone || copy.previewEmpty}
            </div>
            <div>
              <strong>{copy.website}:</strong> {preview.website || copy.previewEmpty}
            </div>
            <div>
              <strong>{copy.socials}:</strong>{" "}
              {preview.socials?.length ? preview.socials.map(s => s.title).join(", ") : copy.previewEmpty}
            </div>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
