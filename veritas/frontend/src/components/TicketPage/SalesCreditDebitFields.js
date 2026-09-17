import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  buildSupportCreditDebitsPayload,
  getTotalResolveCreditDebit,
  getUsableSupportCreditPacks
} from "./ticketClientSummaryUtils";
import { interpolate } from "../../i18n/translate";
import styles from "./SalesCreditDebitFields.module.css";

export function clampCreditAmount(value, max) {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Math.max(0, Math.floor(Number(max) || 0)));
}

export function getTaskCreditSourceKey(taskId) {
  return `task:${String(taskId || "")}`;
}

export function getTaskCreditBalance(sourceBalances, taskId) {
  const rec = sourceBalances?.[getTaskCreditSourceKey(taskId)];
  if (!rec || Number(rec.total) <= 0) return null;
  return rec;
}

/** Default: 1 credit on the first usable pack only (not 1 per pack). */
export function buildSalesCreditDefaultAmounts(packs = [], legacyBalance = 0) {
  const usable = getUsableSupportCreditPacks(packs);
  if (usable.length > 0) {
    return { [usable[0].id]: Math.min(1, Number(usable[0].remaining_amount) || 0) };
  }
  if (Number(legacyBalance) > 0) return { __legacy: 1 };
  return {};
}

function packAmountKey(packId) {
  return packId || "__legacy";
}

export function SalesCreditDebitFields({
  copy,
  supportCredit = null,
  enabled,
  onEnabledChange,
  amounts,
  onAmountsChange,
  disabled = false,
  alreadyDebited = false,
  compact = false,
  currentSource = null,
  refundEnabled = false,
  onRefundEnabledChange,
  refundAmounts = {},
  onRefundAmountsChange
}) {
  const usablePacks = useMemo(() => getUsableSupportCreditPacks(supportCredit?.packs), [supportCredit?.packs]);
  const balance = Number(supportCredit?.balance || 0);
  const currentPacks = Array.isArray(currentSource?.packs) ? currentSource.packs : [];
  const currentTotal = Number(currentSource?.total) || 0;
  const [perPackAmount, setPerPackAmount] = useState(1);
  const plannedTotal = useMemo(
    () => (enabled ? getTotalResolveCreditDebit(amounts, supportCredit?.packs) : 0),
    [enabled, amounts, supportCredit?.packs]
  );
  const plannedRefund = useMemo(() => {
    if (!refundEnabled) return 0;
    return currentPacks.reduce((sum, pack) => {
      const key = packAmountKey(pack.packId);
      return sum + clampCreditAmount(refundAmounts?.[key], pack.amount);
    }, 0);
  }, [refundEnabled, currentPacks, refundAmounts]);

  const applyPerPack = value => {
    const amount = clampCreditAmount(value, 999);
    setPerPackAmount(amount);
    if (usablePacks.length === 0) {
      onAmountsChange?.({ __legacy: clampCreditAmount(amount, balance) });
      return;
    }
    const next = {};
    usablePacks.forEach(pack => {
      next[pack.id] = Math.min(amount, Number(pack.remaining_amount) || 0);
    });
    onAmountsChange?.(next);
  };

  if (alreadyDebited && currentTotal <= 0) {
    return (
      <div className={`${styles.panel} ${compact ? styles.panelCompact : ""}`.trim()}>
        <div className={styles.alreadyRow}>
          <Icon icon="mdi:check-circle-outline" aria-hidden />
          <span>{copy.alreadyDebited || copy.alreadyTask}</span>
        </div>
      </div>
    );
  }

  const addLabel = currentTotal > 0 ? copy.enableAdd || copy.enable : copy.enable;
  const canAdd = balance > 0;
  const canRefund = currentTotal > 0 && Boolean(onRefundEnabledChange);

  return (
    <div className={`${styles.panel} ${compact ? styles.panelCompact : ""}`.trim()}>
      <div className={styles.balanceRow}>
        <Icon icon="mdi:wallet-outline" aria-hidden />
        <span>
          {balance > 0
            ? interpolate(balance === 1 ? copy.available : copy.availablePlural, { count: String(balance) })
            : copy.noneAvailable}
        </span>
      </div>

      {currentTotal > 0 ? (
        <div className={styles.currentBlock}>
          <div className={styles.alreadyRow}>
            <Icon icon="mdi:check-circle-outline" aria-hidden />
            <span>
              {interpolate(copy.currentTask || copy.alreadyTask || "{count}", { count: String(currentTotal) })}
            </span>
          </div>
          {currentPacks.length > 0 ? (
            <ul className={styles.currentList}>
              {currentPacks.map(pack => {
                const label = pack.label || copy.legacyLabel || "Pack";
                return (
                  <li key={packAmountKey(pack.packId)} className={styles.currentItem}>
                    <span className={styles.packLabel}>{label}</span>
                    <span className={styles.currentAmount}>
                      {interpolate(copy.currentPack || "{count}", { count: String(pack.amount) })}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : currentSource && copy.noneOnTask ? (
        <p className={styles.noneOnTask}>{copy.noneOnTask}</p>
      ) : null}

      {canAdd ? (
        <>
          <label className={styles.enableRow}>
            <input
              type="checkbox"
              checked={Boolean(enabled)}
              onChange={e => onEnabledChange?.(e.target.checked)}
              disabled={disabled}
            />
            <span>{addLabel}</span>
          </label>

          {enabled ? (
            <div className={styles.packPanel}>
              <div className={styles.bulkRow}>
                <div className={styles.bulkText}>
                  <span className={styles.bulkLabel}>{copy.perPackLabel}</span>
                  <span className={styles.bulkHint}>{copy.perPackHint}</span>
                </div>
                <input
                  type="number"
                  className={styles.amountInput}
                  min={0}
                  max={999}
                  value={perPackAmount}
                  onChange={e => applyPerPack(e.target.value)}
                  disabled={disabled}
                  aria-label={copy.perPackLabel}
                />
              </div>

              {usablePacks.length > 0 ? (
                <ul className={styles.packList}>
                  {usablePacks.map(pack => {
                    const remaining = Number(pack.remaining_amount) || 0;
                    const label = pack.label || `Pack #${String(pack.id).slice(0, 8)}`;
                    return (
                      <li key={pack.id} className={styles.packRow}>
                        <div className={styles.packMeta}>
                          <span className={styles.packLabel}>{label}</span>
                          <span className={styles.packRemaining}>
                            {interpolate(copy.packRemaining, { count: String(remaining) })}
                          </span>
                        </div>
                        <input
                          type="number"
                          className={styles.amountInput}
                          min={0}
                          max={remaining}
                          value={amounts?.[pack.id] ?? 0}
                          onChange={e =>
                            onAmountsChange?.({
                              ...amounts,
                              [pack.id]: clampCreditAmount(e.target.value, remaining)
                            })
                          }
                          disabled={disabled}
                          aria-label={label}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.packRow}>
                  <div className={styles.packMeta}>
                    <span className={styles.packLabel}>{copy.legacyLabel}</span>
                  </div>
                  <input
                    type="number"
                    className={styles.amountInput}
                    min={0}
                    max={balance}
                    value={amounts?.__legacy ?? 0}
                    onChange={e =>
                      onAmountsChange?.({
                        __legacy: clampCreditAmount(e.target.value, balance)
                      })
                    }
                    disabled={disabled}
                    aria-label={copy.legacyLabel}
                  />
                </div>
              )}

              <div className={styles.totalRow}>
                {interpolate(copy.totalDebit, { count: String(plannedTotal) })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {canRefund ? (
        <>
          <label className={styles.enableRow}>
            <input
              type="checkbox"
              checked={Boolean(refundEnabled)}
              onChange={e => onRefundEnabledChange?.(e.target.checked)}
              disabled={disabled}
            />
            <span>{copy.enableRefund}</span>
          </label>
          {copy.refundHint ? <p className={styles.refundHint}>{copy.refundHint}</p> : null}

          {refundEnabled ? (
            <div className={`${styles.packPanel} ${styles.refundPanel}`.trim()}>
              <ul className={styles.packList}>
                {currentPacks.map(pack => {
                  const key = packAmountKey(pack.packId);
                  const label = pack.label || copy.legacyLabel || "Pack";
                  return (
                    <li key={key} className={styles.packRow}>
                      <div className={styles.packMeta}>
                        <span className={styles.packLabel}>{label}</span>
                        <span className={styles.packRemaining}>
                          {interpolate(copy.currentPack || "{count}", { count: String(pack.amount) })}
                        </span>
                      </div>
                      <input
                        type="number"
                        className={styles.amountInput}
                        min={0}
                        max={pack.amount}
                        value={refundAmounts?.[key] ?? 0}
                        onChange={e =>
                          onRefundAmountsChange?.({
                            ...refundAmounts,
                            [key]: clampCreditAmount(e.target.value, pack.amount)
                          })
                        }
                        disabled={disabled}
                        aria-label={label}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className={`${styles.totalRow} ${styles.totalRefund}`.trim()}>
                {interpolate(copy.totalRefund || "{count}", { count: String(plannedRefund) })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function getSalesCreditRefundsFromState(enabled, amounts, currentPacks = []) {
  if (!enabled) return [];
  return (Array.isArray(currentPacks) ? currentPacks : [])
    .map(pack => {
      const key = pack.packId || "__legacy";
      const amount = clampCreditAmount(amounts?.[key], pack.amount);
      return {
        packId: pack.packId || null,
        amount
      };
    })
    .filter(row => row.amount > 0);
}

export function getSalesCreditDebitsFromState(enabled, amounts, packs) {
  if (!enabled) return [];
  return buildSupportCreditDebitsPayload(amounts, packs);
}

export function getSalesCreditPlannedTotal(enabled, amounts, packs) {
  return enabled ? getTotalResolveCreditDebit(amounts, packs) : 0;
}
