import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAdminPageCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { deleteLoginBrandingAsset, fetchLoginBrandingAdmin, updateLoginBranding, uploadLoginBrandingAsset } from "../../api/loginBranding";
import { DEFAULT_SIDE_COLORS, LOGIN_BRANDING_MAX_UPLOAD_BYTES, LOGIN_SIDES, flatToSideForm, resolveBrandingText, resolveLoginAssetUrl, sideFormToFlat } from "../../utils/loginBrandingUtils";
import { Page, Card, Field, Input, Textarea, Btn, Switch, FormGrid, SubTabs } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import s from "./AdminLoginBranding.module.css";
const EMPTY_SIDE = {
  enabled: false,
  headlineLine1: "",
  headlineLine2: "",
  sub: "",
  features: "",
  brandName: "",
  logoPath: "",
  logoTransparent: false,
  logoBgColor: "",
  bgImagePath: "",
  bgColorStart: "",
  bgColorEnd: "",
  accentColor: "",
  rightBgColor: "",
  rightBgImagePath: "",
  footerText: ""
};
function ColorField({
  label,
  hint,
  value,
  onChange,
  fallback
}) {
  const display = value || fallback || "#000000";
  return <Field label={label} hint={hint}>
      <div className={s.colorRow}>
        <input type="color" className={s.colorInput} value={display} onChange={e => onChange(e.target.value)} aria-label={label} />
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={fallback} />
        {value ? <button type="button" className={s.colorReset} onClick={() => onChange("")}>
            ×
          </button> : null}
      </div>
    </Field>;
}
function AssetUploadField({
  label,
  hint,
  path,
  onUpload,
  onDelete,
  uploading,
  chooseLabel,
  removeLabel,
  previewBackground
}) {
  const inputRef = useRef(null);
  const previewUrl = resolveLoginAssetUrl(path);
  return <Field label={label} hint={hint}>
      <div className={s.assetBox}>
        {previewUrl ? <div className={s.assetPreview} style={previewBackground ? {
        background: previewBackground
      } : undefined}>
            <img src={previewUrl} alt="" />
          </div> : <div className={s.assetPlaceholder}>-</div>}
        <div className={s.assetActions}>
          <Btn variant="secondary" icon="mdi:upload" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "…" : chooseLabel}
          </Btn>
          {path ? <Btn variant="ghost" disabled={uploading} onClick={onDelete}>
              {removeLabel}
            </Btn> : null}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className={s.hiddenFile} onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onUpload(file);
      }} />
      </div>
    </Field>;
}
function LoginPreview({
  side,
  form,
  copy
}) {
  const defaults = DEFAULT_SIDE_COLORS[side];
  const bgStart = form.bgColorStart || defaults.bgColorStart;
  const bgEnd = form.bgColorEnd || defaults.bgColorEnd;
  const accent = form.accentColor || defaults.accentColor;
  const logoUrl = resolveLoginAssetUrl(form.logoPath);
  const bgImageUrl = resolveLoginAssetUrl(form.bgImagePath);
  const rightBgImageUrl = resolveLoginAssetUrl(form.rightBgImagePath);
  const logoBg = form.logoBgColor || defaults.logoBgColor;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 3);
  const panelStyle = {
    background: bgImageUrl ? `linear-gradient(160deg, ${bgStart}dd 0%, ${bgEnd}dd 100%), url("${bgImageUrl}") center/cover` : `linear-gradient(160deg, ${bgStart} 0%, ${bgEnd} 100%)`
  };
  const rightPanelStyle = rightBgImageUrl ? {
    backgroundColor: form.rightBgColor || defaults.rightBgColor,
    backgroundImage: `url("${rightBgImageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center"
  } : {
    background: form.rightBgColor || defaults.rightBgColor
  };
  const headline1 = resolveBrandingText(form.headlineLine1, copy.previewHeadline1);
  const headline2 = resolveBrandingText(form.headlineLine2, copy.previewHeadline2);
  const sub = resolveBrandingText(form.sub, copy.previewSub);
  const brandName = form.brandName === "" ? "Veritas" : String(form.brandName || "").trim() || "";
  return <div className={s.previewShell}>
      <p className={s.previewLabel}>{copy.previewLabel}</p>
      <div className={s.previewFrame}>
        <aside className={s.previewLeft} style={panelStyle}>
          <div className={s.previewBrand}>
            {logoUrl ? <img src={logoUrl} alt="" className={s.previewLogo} style={form.logoTransparent ? {
            background: logoBg
          } : {
            background: "transparent"
          }} /> : <div className={s.previewBrandIcon} style={{
            background: accent
          }}>V</div>}
            <span>{brandName || "\u00A0"}</span>
          </div>
          <h3 className={s.previewHeadline}>
            {headline1}
            {headline1 || headline2 ? <br /> : null}
            {headline2}
          </h3>
          <p className={s.previewSub}>{sub}</p>
          <ul className={s.previewFeatures}>
            {features.map(item => <li key={item}>
                <span style={{
              background: accent
            }} />
                {item}
              </li>)}
          </ul>
        </aside>
        <div className={s.previewRight} style={rightPanelStyle}>
          <div className={s.previewCard}>
            <div className={s.previewToggle} />
            <div className={s.previewField} />
            <div className={s.previewField} />
            <button type="button" className={s.previewBtn} style={{
            background: accent
          }}>
              {copy.previewButton}
            </button>
          </div>
        </div>
      </div>
    </div>;
}
export default function AdminLoginBranding({
  isCommunity = false
}) {
  const copy = useAdminPageCopy("loginBranding");
  const common = useCommonCopy();
  const [activeSide, setActiveSide] = useState("agent");
  const [forms, setForms] = useState({
    agent: {
      ...EMPTY_SIDE
    },
    client: {
      ...EMPTY_SIDE
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const sideTabs = useMemo(() => LOGIN_SIDES.map(side => ({
    key: side,
    label: copy.tabs[side],
    icon: side === "agent" ? "mdi:account-tie-outline" : "mdi:domain",
    proOnly: isCommunity
  })), [copy.tabs, isCommunity]);
  const load = useCallback(async () => {
    if (isCommunity) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchLoginBrandingAdmin();
      const settings = data.settings || {};
      setForms({
        agent: flatToSideForm(settings, "agent"),
        client: flatToSideForm(settings, "client")
      });
    } catch (err) {
      toast.error(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, isCommunity]);
  useEffect(() => {
    load();
  }, [load]);
  const form = forms[activeSide];
  const defaults = DEFAULT_SIDE_COLORS[activeSide];
  const setField = (key, value) => {
    setForms(prev => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        [key]: value
      }
    }));
  };
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...sideFormToFlat("agent", forms.agent),
        ...sideFormToFlat("client", forms.client)
      };
      const {
        settings
      } = await updateLoginBranding(payload);
      setForms({
        agent: flatToSideForm(settings, "agent"),
        client: flatToSideForm(settings, "client")
      });
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleUpload = async (kind, file) => {
    if (file.size > LOGIN_BRANDING_MAX_UPLOAD_BYTES) {
      toast.error(copy.uploadTooLarge);
      return;
    }
    const allowed = /image\/(png|jpe?g|webp)/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name || "");
    if (file.type && !allowed && file.type !== "application/octet-stream") {
      toast.error(copy.uploadBadFormat);
      return;
    }
    setUploading(kind);
    try {
      const {
        path,
        key
      } = await uploadLoginBrandingAsset(activeSide, kind, file);
      const field = key.includes("right_bg_image") ? "rightBgImagePath" : key.includes("bg_image") ? "bgImagePath" : "logoPath";
      setField(field, path);
      toast.success(copy.uploadSuccess);
    } catch (err) {
      toast.error(err.message || copy.uploadError);
    } finally {
      setUploading(null);
    }
  };
  const handleDeleteAsset = async kind => {
    setUploading(kind);
    try {
      await deleteLoginBrandingAsset(activeSide, kind);
      const field = kind === "right-background" ? "rightBgImagePath" : kind === "background" ? "bgImagePath" : "logoPath";
      setField(field, "");
      toast.success(copy.deleteSuccess);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setUploading(null);
    }
  };
  if (loading) {
    return <Page>
        <p className={adminUi.adminMutedText}>{copy.loading}</p>
      </Page>;
  }
  if (isCommunity) {
    return <Page>
        <Card title={copy.title} description={copy.communityLocked}>
          <p className={adminUi.adminMutedText}>{copy.communityHint}</p>
        </Card>
      </Page>;
  }
  return <Page>
      <SubTabs items={sideTabs} active={activeSide} onChange={setActiveSide} fullWidth />

      <Card>
        <div className={s.enabledRow}>
          <Switch checked={form.enabled} onChange={checked => setField("enabled", checked)} label={copy.enabledLabel} />
          <span className={adminUi.adminMutedText}>{copy.enabledHint}</span>
        </div>

        <FormGrid cols={2}>
          <Field label={copy.headline1Label} hint={copy.blankFieldHint}>
            <Input value={form.headlineLine1} onChange={e => setField("headlineLine1", e.target.value)} placeholder={copy.previewHeadline1} />
          </Field>
          <Field label={copy.headline2Label} hint={copy.blankFieldHint}>
            <Input value={form.headlineLine2} onChange={e => setField("headlineLine2", e.target.value)} placeholder={copy.previewHeadline2} />
          </Field>
          <Field label={copy.subLabel} spanFull hint={copy.blankFieldHint}>
            <Textarea value={form.sub} onChange={e => setField("sub", e.target.value)} rows={2} placeholder={copy.previewSub} />
          </Field>
          <Field label={copy.featuresLabel} spanFull hint={copy.featuresHint}>
            <Textarea value={form.features} onChange={e => setField("features", e.target.value)} rows={4} placeholder={copy.featuresPlaceholder} />
          </Field>
          <Field label={copy.brandNameLabel} hint={copy.blankFieldHint}>
            <Input value={form.brandName} onChange={e => setField("brandName", e.target.value)} placeholder="Veritas" />
          </Field>
          <Field label={copy.footerLabel} hint={copy.blankFieldHint}>
            <Input value={form.footerText} onChange={e => setField("footerText", e.target.value)} placeholder={copy.footerPlaceholder} />
          </Field>
        </FormGrid>
      </Card>

      <FormGrid cols={2} className={s.cardRow}>
        <Card title={copy.visualTitle} description={copy.visualDescription}>
          <FormGrid cols={2}>
            <ColorField label={copy.bgStartLabel} value={form.bgColorStart} fallback={defaults.bgColorStart} onChange={value => setField("bgColorStart", value)} />
            <ColorField label={copy.bgEndLabel} value={form.bgColorEnd} fallback={defaults.bgColorEnd} onChange={value => setField("bgColorEnd", value)} />
            <ColorField label={copy.accentLabel} value={form.accentColor} fallback={defaults.accentColor} onChange={value => setField("accentColor", value)} />
            <ColorField label={copy.rightBgLabel} value={form.rightBgColor} fallback={defaults.rightBgColor} onChange={value => setField("rightBgColor", value)} />
            <AssetUploadField label={copy.logoLabel} hint={copy.logoHint} path={form.logoPath} uploading={uploading === "logo"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} previewBackground={form.logoPath && form.logoTransparent ? form.logoBgColor || defaults.logoBgColor : undefined} onUpload={file => handleUpload("logo", file)} onDelete={() => handleDeleteAsset("logo")} />
            <AssetUploadField label={copy.bgImageLabel} hint={copy.bgImageHint} path={form.bgImagePath} uploading={uploading === "background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("background", file)} onDelete={() => handleDeleteAsset("background")} />
            <AssetUploadField label={copy.rightBgImageLabel} hint={copy.rightBgImageHint} path={form.rightBgImagePath} uploading={uploading === "right-background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("right-background", file)} onDelete={() => handleDeleteAsset("right-background")} />
            {form.logoPath ? <>
                <Field label={copy.logoTransparentLabel} spanFull hint={copy.logoTransparentHint}>
                  <Switch checked={form.logoTransparent} onChange={checked => setField("logoTransparent", checked)} label={copy.logoTransparentSwitch} />
                </Field>
                {form.logoTransparent ? <ColorField label={copy.logoBgLabel} hint={copy.logoBgHint} value={form.logoBgColor} fallback={defaults.logoBgColor} onChange={value => setField("logoBgColor", value)} /> : null}
              </> : null}
          </FormGrid>
        </Card>

        <Card title={copy.previewTitle} description={copy.previewDescription} noPadding>
          <LoginPreview side={activeSide} form={form} copy={copy} />
        </Card>
      </FormGrid>

      <div className={s.footerBar}>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
          {saving ? common.saving : common.save}
        </Btn>
      </div>
    </Page>;
}
