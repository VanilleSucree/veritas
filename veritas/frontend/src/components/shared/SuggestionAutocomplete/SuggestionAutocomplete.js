import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { getModalDropdownZIndex } from "../../../utils/dropdownPortal";
import styles from "./SuggestionAutocomplete.module.css";
const DROPDOWN_MAX_HEIGHT = 240;
export default function SuggestionAutocomplete({
  id,
  label,
  required = false,
  placeholder = "Search…",
  value = "",
  options = [],
  disabled = false,
  onChange,
  emptyMessage = "No suggestions",
  hintMessage = "",
  minQueryLength = 0,
  className = ""
}) {
  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  useEffect(() => {
    setSearch(value || "");
  }, [value]);
  const updateMenuPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp ? {
        top: rect.top - 4,
        transform: "translateY(-100%)"
      } : {
        top: rect.bottom - 1
      })
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    return undefined;
  }, [open, updateMenuPosition]);
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setSearch(value || "");
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition, value]);
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const labels = options.map(option => String(option?.label || option || "").trim()).filter(Boolean);
    if (query.length < minQueryLength) return [];
    if (!query) return labels.slice(0, 50);
    return labels.filter(labelText => labelText.toLowerCase().includes(query)).slice(0, 50);
  }, [options, search, minQueryLength]);
  useEffect(() => {
    setHighlight(0);
  }, [search, open]);
  const pickOption = useCallback(labelText => {
    const next = String(labelText || "").trim();
    setSearch(next);
    onChange?.(next);
    setOpen(false);
  }, [onChange]);
  const handleInputChange = event => {
    const next = event.target.value;
    setSearch(next);
    if (next.trim() !== String(value || "").trim()) {
      onChange?.("");
    }
    setOpen(true);
  };
  const handleKeyDown = event => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || filteredOptions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(h => Math.min(h + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      pickOption(filteredOptions[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearch(value || "");
    }
  };
  const queryLength = search.trim().length;
  const needsMoreQuery = queryLength < minQueryLength;
  const menuEmptyMessage = needsMoreQuery && hintMessage ? hintMessage : emptyMessage;
  const labelId = id ? `${id}-label` : undefined;
  return <div className={`${styles.field} ${className}`.trim()} ref={rootRef}>
      {label ? <label className={styles.label} htmlFor={id} id={labelId}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label> : null}
      <div ref={anchorRef} className={`${styles.inputWrap} ${open ? styles.inputWrapOpen : ""} ${disabled ? styles.inputWrapDisabled : ""}`}>
        <Icon icon="mdi:magnify" className={styles.inputIcon} aria-hidden />
        <input id={id} type="text" className={styles.input} value={search} placeholder={placeholder} disabled={disabled} autoComplete="off" aria-labelledby={labelId} aria-expanded={open} aria-haspopup="listbox" aria-autocomplete="list" onChange={handleInputChange} onFocus={() => !disabled && setOpen(true)} onKeyDown={handleKeyDown} />
        {value ? <button type="button" className={styles.clearBtn} onClick={() => {
        setSearch("");
        onChange?.("");
        setOpen(false);
      }} disabled={disabled} aria-label="Clear selection">
            <Icon icon="mdi:close" aria-hidden />
          </button> : null}
      </div>
      {open && menuStyle ? createPortal(<div ref={menuRef} className={styles.dropdown} style={menuStyle} role="listbox" aria-labelledby={labelId}>
              {filteredOptions.length === 0 ? <div className={styles.empty}>{menuEmptyMessage}</div> : filteredOptions.map((labelText, idx) => <button key={labelText} type="button" role="option" aria-selected={value === labelText} className={`${styles.option} ${highlight === idx ? styles.optionActive : ""} ${value === labelText ? styles.optionSelected : ""}`.trim()} onMouseEnter={() => setHighlight(idx)} onClick={() => pickOption(labelText)}>
                    {labelText}
                  </button>)}
            </div>, document.body) : null}
    </div>;
}
