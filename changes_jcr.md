# JCR / Public Installation Form — Uncommitted Changes

This document describes every uncommitted change in the working tree so the same
changes can be replicated in another repo that shares this codebase.

Two features are introduced:

1. **QR code scanning + searchable dropdowns** for equipment serials in the
   Public Installation Form (Solar Panel / Battery / Luminaire).
2. **Work order alias matching + smart row-fill on import** in the JCR screen,
   fixing a bug where selecting a work order by *name* matched 0 installations.

## Summary of changed files

| File | Type | Change |
|------|------|--------|
| `package.json` | modified | Added `html5-qrcode` dependency |
| `package-lock.json` | modified | Lockfile entry for `html5-qrcode` |
| `src/components/QrScannerModal.jsx` | **new** | Camera-based QR/barcode scanner modal |
| `src/components/QrScannerModal.css` | **new** | Styles for the scanner modal |
| `src/components/SearchableSelect.jsx` | **new** | Searchable dropdown component |
| `src/components/SearchableSelect.css` | **new** | Styles for the searchable dropdown |
| `src/components/PublicInstallationForm.jsx` | modified | Wire scanner + searchable select into serial fields |
| `src/components/PublicInstallationForm.css` | modified | Styles for scan row/button/result |
| `src/components/JCR.jsx` | modified | Work order aliasing + import row-fill fix |

---

## 1. Dependency

### `package.json`
Add one dependency under `dependencies` (keep alphabetical order between
`html2canvas` and `jspdf`):

```json
"html5-qrcode": "^2.3.8",
```

Then run `npm install` to regenerate `package-lock.json`.

---

## 2. New file — `src/components/QrScannerModal.jsx`

Camera-based QR/barcode scanner. Prefers the rear camera, decodes the first code
it sees, returns the text via `onResult`. Props: `title`, `onResult(text)`, `onClose()`.

```jsx
import { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import './QrScannerModal.css';

// A full-screen friendly QR/barcode scanner. Opens the device camera (prefers
// the rear camera on phones), decodes the first code it sees, and hands the
// decoded text back via onResult. Designed to feel at home on mobile.
function QrScannerModal({ title = 'Scan code', onResult, onClose }) {
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const resolvedRef = useRef(false);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const html5 = new Html5Qrcode(regionId.current, { verbose: false });
    scannerRef.current = html5;

    const config = {
      fps: 10,
      qrbox: (vw, vh) => {
        const size = Math.floor(Math.min(vw, vh) * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    const handleSuccess = (decodedText) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      // Stop before reporting so the camera light turns off immediately.
      html5
        .stop()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) onResult(String(decodedText || '').trim());
        });
    };

    html5
      .start({ facingMode: 'environment' }, config, handleSuccess, () => {})
      .then(() => {
        if (!cancelled) setStatus('scanning');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Could not start the camera. Make sure no other app is using it.'
        );
      });

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      if (inst) {
        inst
          .stop()
          .catch(() => {})
          .finally(() => {
            try { inst.clear(); } catch { /* ignore */ }
          });
      }
    };
  }, [onResult]);

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-head">
          <h3>{title}</h3>
          <button type="button" className="qr-close" onClick={onClose} aria-label="Close scanner">
            <X size={20} />
          </button>
        </div>

        <div className="qr-viewport">
          <div id={regionId.current} className="qr-region" />
          {status === 'starting' && (
            <div className="qr-status">
              <Loader2 size={28} className="qr-spin" />
              <span>Starting camera…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="qr-status qr-status-error">
              <AlertCircle size={28} />
              <span>{error}</span>
            </div>
          )}
          {status === 'scanning' && <div className="qr-frame" aria-hidden="true" />}
        </div>

        <p className="qr-hint">
          {status === 'scanning'
            ? 'Point the camera at the QR code or barcode.'
            : status === 'error'
              ? 'Close and try again once camera access is granted.'
              : 'Please wait…'}
        </p>
      </div>
    </div>
  );
}

export default QrScannerModal;
```

---

## 3. New file — `src/components/QrScannerModal.css`

```css
.qr-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.qr-modal {
  width: 100%;
  max-width: 420px;
  background: #0f172a;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.qr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  color: #fff;
}

.qr-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.qr-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.qr-close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.qr-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #000;
  overflow: hidden;
}

.qr-region {
  width: 100%;
  height: 100%;
}

.qr-region video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

.qr-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.qr-status-error {
  color: #fca5a5;
}

.qr-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70%;
  height: 70%;
  transform: translate(-50%, -50%);
  border: 3px solid rgba(245, 158, 11, 0.9);
  border-radius: 16px;
  box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.qr-hint {
  margin: 0;
  padding: 14px 16px;
  color: #cbd5e1;
  font-size: 0.82rem;
  text-align: center;
}

.qr-spin {
  animation: qr-spin 0.9s linear infinite;
}

@keyframes qr-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 520px) {
  .qr-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .qr-modal {
    max-width: 100%;
    border-radius: 18px 18px 0 0;
  }
}
```

---

## 4. New file — `src/components/SearchableSelect.jsx`

Lightweight searchable dropdown for long serial lists. Props: `id`, `value`,
`options` (array of `{ value, label }`), `onChange(value)`, `placeholder`, `disabled`.

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import './SearchableSelect.css';

// A lightweight searchable dropdown used for long equipment-serial lists.
// Keeps the same visual language as the native pf-field select but adds a
// filter box so field users can quickly narrow a large list.
function SearchableSelect({
  id,
  value,
  options, // array of { value, label }
  onChange,
  placeholder = 'Select…',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search box when the list opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) { setQuery(''); setHighlight(0); }
  }, [open]);

  const choose = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`ss-wrap ${disabled ? 'ss-disabled' : ''}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="ss-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`ss-value ${selected ? '' : 'ss-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className={`ss-caret ${open ? 'ss-caret-open' : ''}`} />
      </button>

      {open && (
        <div className="ss-panel" role="listbox">
          <div className="ss-search">
            <Search size={16} className="ss-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search serial…"
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
            />
            {query && (
              <button type="button" className="ss-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ss-list">
            {filtered.length === 0 ? (
              <div className="ss-empty">No matches</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`ss-option ${i === highlight ? 'ss-hl' : ''} ${opt.value === value ? 'ss-sel' : ''}`}
                  onClick={() => choose(opt)}
                  onMouseEnter={() => setHighlight(i)}
                  role="option"
                  aria-selected={opt.value === value}
                >
                  <span className="ss-option-label">{opt.label}</span>
                  {opt.value === value && <Check size={16} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
```

---

## 5. New file — `src/components/SearchableSelect.css`

```css
.ss-wrap {
  position: relative;
  width: 100%;
}

.ss-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 1rem;
  color: #0f172a;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ss-trigger:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}

.ss-disabled .ss-trigger {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: default;
}

.ss-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-placeholder {
  color: #94a3b8;
}

.ss-caret {
  flex-shrink: 0;
  color: #64748b;
  transition: transform 0.15s;
}

.ss-caret-open {
  transform: rotate(180deg);
}

.ss-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 50;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.ss-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.ss-search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.ss-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: #0f172a;
  background: transparent;
}

.ss-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
}

.ss-clear:hover {
  background: #e2e8f0;
}

.ss-list {
  max-height: 240px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.ss-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}

.ss-option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-hl {
  background: #fef3c7;
}

.ss-sel {
  color: #b45309;
  font-weight: 600;
}

.ss-sel svg {
  color: #f59e0b;
  flex-shrink: 0;
}

.ss-empty {
  padding: 16px 14px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}

@media (max-width: 520px) {
  .ss-list {
    max-height: 200px;
  }
}
```

---

## 6. Modified — `src/components/PublicInstallationForm.jsx`

Wires the QR scanner and searchable select into the three equipment-serial
fields (module / battery / luminaire).

### 6.1 Imports
Add `QrCode` to the lucide import, and import the two new components.

Change the lucide-react import line that ends with `Camera,` to add `QrCode`:

```jsx
  Paperclip, Image as ImageIcon, FileText, X, Loader2, Camera, QrCode,
```

Add after `import Logo from './Logo';`:

```jsx
import QrScannerModal from './QrScannerModal';
import SearchableSelect from './SearchableSelect';
```

### 6.2 Category labels
After the `WO_FIELD_TO_CATEGORY` map, add:

```jsx
// Friendly labels for the equipment categories, used in scanner titles and
// the "not found" messages shown under a field.
const CATEGORY_LABEL = {
  module: 'Solar Panel',
  battery: 'Battery',
  luminaire: 'Luminaire',
};
```

### 6.3 Scan state
After the `const [serialWarnings, setSerialWarnings] = useState([]);` line, add:

```jsx
  // QR scanning for equipment serials. `scanField` holds the field key being
  // scanned (or null when the scanner is closed). `scanResults` keeps the last
  // scanned text + match status per field so we can show it below the input.
  const [scanField, setScanField] = useState(null);
  const [scanResults, setScanResults] = useState({});
```

### 6.4 Scan result handler
After the `update` useCallback, add:

```jsx
  // Called when the QR scanner decodes a code for the given field. We try to
  // match the scanned text against the available serials for that category.
  // On a match we set the dropdown value; otherwise we flag it as not found.
  const handleScanResult = useCallback((fieldKey, rawText) => {
    const scanned = String(rawText || '').trim();
    const category = WO_FIELD_TO_CATEGORY[fieldKey];
    const options = woItems[category] || [];
    const match = options.find(
      (it) => String(it.serial).trim().toLowerCase() === scanned.toLowerCase()
    );
    if (match) {
      update(fieldKey, match.serial);
      setScanResults((prev) => ({ ...prev, [fieldKey]: { text: scanned, found: true } }));
    } else {
      setScanResults((prev) => ({ ...prev, [fieldKey]: { text: scanned, found: false } }));
    }
    setScanField(null);
  }, [woItems, update]);
```

### 6.5 Replace the serial `<select>` with scan row + SearchableSelect
Inside the serial-field render block, grab the scan result:

```jsx
                      const options = woItems[category] || [];
                      const scan = scanResults[f.key];
```

Then replace the old native `<select>…</select>` block with:

```jsx
                          <div className="pf-scan-row">
                            <SearchableSelect
                              id={f.key}
                              value={form[f.key] ?? ''}
                              options={options.map((it) => ({ value: it.serial, label: it.serial }))}
                              onChange={(val) => update(f.key, val)}
                              disabled={woLoading || options.length === 0}
                              placeholder={
                                woLoading
                                  ? 'Loading…'
                                  : options.length === 0
                                    ? 'No serials available'
                                    : `— Select ${f.label} —`
                              }
                            />
                            <button
                              type="button"
                              className="pf-scan-btn"
                              onClick={() => setScanField(f.key)}
                              disabled={woLoading || options.length === 0}
                              title={`Scan ${CATEGORY_LABEL[category]} QR code`}
                              aria-label={`Scan ${CATEGORY_LABEL[category]} QR code`}
                            >
                              <QrCode size={18} />
                              <span>Scan</span>
                            </button>
                          </div>
                          {scan && (
                            <span className={`pf-scan-result ${scan.found ? 'ok' : 'bad'}`}>
                              {scan.found ? (
                                <><Check size={14} /> Scanned: {scan.text}</>
                              ) : (
                                <><AlertCircle size={14} /> Scanned “{scan.text}” — no such pending {CATEGORY_LABEL[category]} installation item in this list.</>
                              )}
                            </span>
                          )}
```

(The surrounding `<label>…</label>` and `<span className="pf-help">…</span>`
stay unchanged.)

### 6.6 Render the scanner modal
Just after the closing `</div>` of the form card (before the confirmation
popup), add:

```jsx
      {/* QR scanner popup */}
      {scanField && (
        <QrScannerModal
          title={`Scan ${CATEGORY_LABEL[WO_FIELD_TO_CATEGORY[scanField]]} code`}
          onResult={(text) => handleScanResult(scanField, text)}
          onClose={() => setScanField(null)}
        />
      )}
```

---

## 7. Modified — `src/components/PublicInstallationForm.css`

Add these styles (right after the `.pf-field { margin-bottom: 16px; }` rule,
before `.pf-help`):

```css
/* Equipment serial select + QR scan button */
.pf-scan-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.pf-scan-row select,
.pf-scan-row .ss-wrap {
  flex: 1;
  min-width: 0;
}

.pf-scan-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid #f59e0b;
  border-radius: 10px;
  background: #fffbeb;
  color: #b45309;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.pf-scan-btn:hover:not(:disabled) {
  background: #fef3c7;
  border-color: #d97706;
}

.pf-scan-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.pf-scan-result {
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.35;
  padding: 6px 10px;
  border-radius: 8px;
}

.pf-scan-result svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.pf-scan-result.ok {
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.pf-scan-result.bad {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

@media (max-width: 520px) {
  .pf-scan-btn span {
    display: none;
  }

  .pf-scan-btn {
    padding: 0 14px;
  }
}
```

---

## 8. Modified — `src/components/JCR.jsx`

Three related changes. Bug fixed: selecting a work order by **name** matched 0
installations, because installations store a free-text `work_order` that is
usually an **order number**, not the name.

### 8.1 Add `workOrderAliases` memo
After the memo that builds the sorted list of work-order options (the one
ending with `}, [workOrders, cachedInstallations]);`), add:

```jsx
  // Map each selectable option (work order name OR any order number) to the
  // full set of equivalent identifiers for that work order. A work order's
  // name and its order numbers are interchangeable, so selecting any one of
  // them must match installations linked by ANY of the group's identifiers.
  // Without this, picking a work order by *name* found 0 rows because
  // installations store a free-text `work_order` that is usually an order
  // number, not the name.
  const workOrderAliases = useMemo(() => {
    const map = new Map(); // lowercased identifier -> Set of lowercased aliases
    for (const wo of workOrders) {
      const group = new Set();
      if (wo.name) group.add(String(wo.name).trim().toLowerCase());
      for (const num of wo.order_numbers || []) {
        if (num) group.add(String(num).trim().toLowerCase());
      }
      for (const key of group) {
        const existing = map.get(key) || new Set();
        for (const g of group) existing.add(g);
        map.set(key, existing);
      }
    }
    return map;
  }, [workOrders]);
```

### 8.2 Expand selected work orders into aliases when filtering
In the installations-filtering callback, replace the selected-work-orders block:

Old:
```jsx
      if (selectedWorkOrders.length > 0) {
        const woSet = new Set(selectedWorkOrders.map(w => w.toLowerCase().trim()));
        filtered = filtered.filter(inst =>
          inst.work_order && woSet.has(String(inst.work_order).toLowerCase().trim())
        );
```

New:
```jsx
      // Expand each picked option into ALL equivalent identifiers (work order
      // name + every order number) so installations linked by any one of them
      // are matched, regardless of which identifier the user selected.
      if (selectedWorkOrders.length > 0) {
        const woSet = new Set();
        for (const w of selectedWorkOrders) {
          const key = String(w).toLowerCase().trim();
          woSet.add(key);
          const aliases = workOrderAliases.get(key);
          if (aliases) for (const a of aliases) woSet.add(a);
        }
        filtered = filtered.filter(inst =>
          inst.work_order && woSet.has(String(inst.work_order).toLowerCase().trim())
        );
```

And add `workOrderAliases` to that callback's dependency array:

```jsx
  }, [filterWorkOrder, filterLocation, selectedWorkOrders, cachedInstallations, workOrderAliases]);
```

### 8.3 Rewrite `handleImportInstallations` (ID matching + row-fill)
Changes:
- Match selected ids as strings (avoids `parseInt` type mismatches).
- Build `mapped` rows without pre-assigning `serialNo`.
- Fill existing empty placeholder rows first, then append leftovers, and
  renumber `serialNo` sequentially.

Replace the whole callback body with:

```jsx
  const handleImportInstallations = useCallback((selectedIds) => {
    const idSet = new Set(selectedIds.map(String));
    const selected = availableInstallations.filter(inst =>
      idSet.has(String(inst.id))
    );

    if (selected.length === 0) {
      // (keep existing early-return / message handling here)
      return;
    }

    // Map installation records to JCR installation format
    const mapped = selected.map((inst) => ({
      beneficiaryName: inst.exact_location || '',
      latitude: inst.latitude || '',
      longitude: inst.longitude || '',
      // ...keep the rest of the existing field mappings unchanged...
      rms: inst.rms || 'YES',
    }));

    setFormData(prev => {
      // A row is "empty" if the user hasn't entered any identifying data yet.
      // These are the placeholder rows auto-generated from the systems count,
      // so we fill them first before appending any extra imported rows.
      const isEmptyRow = (row) =>
        !row.beneficiaryName &&
        !row.villageGramPanchayat &&
        !row.block &&
        !row.moduleSerialNo &&
        !row.batterySerialNo &&
        !row.luminaireSerialNo;

      const existing = [...prev.installations];
      const remaining = [...mapped];

      // Fill existing empty rows first.
      for (let i = 0; i < existing.length && remaining.length > 0; i++) {
        if (isEmptyRow(existing[i])) {
          existing[i] = { ...remaining.shift(), serialNo: existing[i].serialNo };
        }
      }

      // Append whatever is left over.
      const merged = [...existing, ...remaining].map((row, i) => ({
        ...row,
        serialNo: i + 1,
      }));

      return {
        ...prev,
        installations: merged,
        systemsInThisJCR: merged.length.toString(),
      };
    });

    setFilterMessage({
      type: 'success',
      text: `✓ Imported ${mapped.length} installation(s) into JCR form.`
    });
    setShowFilters(false);
  }, [availableInstallations]);
```

> Note: keep the full field mapping from the original `mapped` object (module,
> battery, luminaire serials, block, village, rms, etc.) — only `serialNo` was
> removed from the per-item map; it is now assigned during the merge step.

### 8.4 Pass ids as strings from the Import button
In the import button `onClick`, the selected checkbox ids are no longer parsed
to int:

Old:
```jsx
                      ).map(cb => parseInt(cb.dataset.id));
```

New:
```jsx
                      ).map(cb => cb.dataset.id);
```

---

## Apply order in the other repo

1. `package.json` → add `html5-qrcode`, run `npm install`.
2. Create the four new files (`QrScannerModal.jsx/.css`, `SearchableSelect.jsx/.css`).
3. Apply the `PublicInstallationForm.jsx` and `.css` edits.
4. Apply the `JCR.jsx` edits.
5. Build/lint to confirm no missing imports.
