import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./RapportCreateWizard.module.css";

function getClientName(client, copy) {
  return client?.name || client?.nom || copy.create.getClientLabel(client?.id);
}

export default function ReportCreateWizard({
  copy,
  reportTypes,
  clients,
  loading,
  step,
  onStepChange,
  selectedClientId,
  onSelectClient,
  onStartReport
}) {
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const selectedClient = clients.find(client => String(client.id) === String(selectedClientId)) || null;
  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    const sorted = [...clients].sort((left, right) => getClientName(left, copy).localeCompare(getClientName(right, copy), undefined, {
      sensitivity: "base"
    }));
    if (!query) return sorted;
    return sorted.filter(client => {
      const name = getClientName(client, copy).toLowerCase();
      const number = String(client.client_number || client.clientNumber || "").toLowerCase();
      return name.includes(query) || number.includes(query);
    });
  }, [clients, copy, enterpriseSearch]);

  useEffect(() => {
    if (step === "type" && !selectedClientId) onStepChange("client");
  }, [onStepChange, selectedClientId, step]);

  const wizard = copy.wizard;
  const selectedClientName = selectedClient ? getClientName(selectedClient, copy) : "";

  const handlePickClient = client => {
    onSelectClient(String(client.id));
    setEnterpriseSearch("");
    onStepChange("type");
  };

  return <div className={styles.picker} data-guide="report-wizard">
      <nav className={styles.steps} aria-label={wizard.progressAria} data-guide="report-steps">
        <span className={`${styles.step} ${step === "client" ? styles.stepActive : styles.stepDone}`}>
          <span className={styles.stepIndex}>1</span>
          {wizard.stepClient}
        </span>
        <span className={styles.stepRule} aria-hidden />
        <span className={`${styles.step} ${step === "type" ? styles.stepActive : ""}`}>
          <span className={styles.stepIndex}>2</span>
          {wizard.stepType}
        </span>
      </nav>

      {step === "client" ? <section className={styles.stage} data-guide="report-client">
          <header className={styles.stageHeader}>
            <h2 className={styles.stageTitle}>{wizard.clientTitle}</h2>
            <p className={styles.stageHint}>{wizard.clientHint}</p>
          </header>

          <label className={styles.search} htmlFor="rapport-enterprise-search">
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input id="rapport-enterprise-search" type="search" className={styles.searchInput} placeholder={copy.create.enterpriseSearch} autoComplete="off" value={enterpriseSearch} onChange={event => setEnterpriseSearch(event.target.value)} disabled={loading} />
            {enterpriseSearch ? <button type="button" className={styles.searchClear} onClick={() => setEnterpriseSearch("")} aria-label={wizard.clearSearchAria}>
                <Icon icon="mdi:close" aria-hidden />
              </button> : null}
          </label>

          {loading ? <div className={styles.list} aria-hidden>
              {Array.from({
            length: 8
          }).map((_, index) => <div key={index} className={styles.rowSkeleton} />)}
            </div> : filteredClients.length === 0 ? <div className={styles.empty}>
              <p>{copy.create.noEnterprise}</p>
              {enterpriseSearch ? <button type="button" className={styles.textBtn} onClick={() => setEnterpriseSearch("")}>
                  {wizard.clearSearch}
                </button> : null}
            </div> : <div className={styles.list} role="listbox" aria-label={wizard.clientGridAria}>
              {filteredClients.map(client => {
            const name = getClientName(client, copy);
            const clientNumber = client.client_number || client.clientNumber;
            const selected = String(client.id) === String(selectedClientId);
            return <button key={client.id} type="button" role="option" aria-selected={selected} className={`${styles.row} ${selected ? styles.rowSelected : ""}`.trim()} onClick={() => handlePickClient(client)}>
                    <span className={styles.rowName}>{name}</span>
                    {clientNumber ? <span className={styles.rowNumber}>{clientNumber}</span> : null}
                    <Icon icon="mdi:chevron-right" className={styles.rowChevron} aria-hidden />
                  </button>;
          })}
            </div>}
        </section> : null}

      {step === "type" ? <section className={styles.stage} data-guide="report-types">
          <header className={styles.stageHeader}>
            <h2 className={styles.stageTitle}>{wizard.typeTitle}</h2>
            <p className={styles.stageHint}>{wizard.typeHint}</p>
            {selectedClient ? <button type="button" className={styles.clientChip} onClick={() => onStepChange("client")}>
                <span className={styles.clientChipName}>{selectedClientName}</span>
                <span className={styles.clientChipAction}>{wizard.changeClient}</span>
              </button> : null}
          </header>

          <div className={styles.list} role="list">
            {reportTypes.map(type => {
          const comingSoon = Boolean(type.comingSoon);
          return <button key={type.id} type="button" role="listitem" className={`${styles.row} ${comingSoon ? styles.rowSoon : ""}`.trim()} disabled={comingSoon} aria-disabled={comingSoon || undefined} onClick={() => {
            if (!comingSoon) onStartReport(type.id);
          }}>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>{type.title}</span>
                  {type.description ? <span className={styles.rowDesc}>{type.description}</span> : null}
                </span>
                {comingSoon ? <span className={styles.rowSoonBadge}>{copy.create.badgeSoon}</span> : <Icon icon="mdi:chevron-right" className={styles.rowChevron} aria-hidden />}
              </button>;
        })}
          </div>

          <button type="button" className={styles.backBtn} onClick={() => onStepChange("client")}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {wizard.back}
          </button>
        </section> : null}
    </div>;
}
