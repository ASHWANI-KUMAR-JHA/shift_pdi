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
