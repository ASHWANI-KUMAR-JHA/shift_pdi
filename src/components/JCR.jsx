import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Filter } from 'lucide-react';
import ComboboxWithHistory from './ComboboxWithHistory';
import InstallationTable from './InstallationTable';
import { saveJCRDraft, loadJCRDraft, getAllJCRDrafts, deleteJCRDraft } from '../utils/jcrStorage';
import { generateJCRPDF, generateJCRPreview } from '../utils/jcrPdfGenerator';
import { fetchInstallations } from '../utils/installations';
import { fetchWorkOrders } from '../utils/workorders';
import { getPendingJCRImport, clearPendingJCRImport } from '../utils/jcrDataTransfer';
import './JCR.css';

// Convert a date value from any of the formats the installation register
// stores (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, ISO timestamps, Excel serial
// numbers, or already-correct YYYY-MM-DD) into the strict YYYY-MM-DD string
// that <input type="date"> requires. Without this the date inputs render
// blank even though the data is present. Returns '' when it can't parse.
const normalizeDate = (value) => {
  if (!value && value !== 0) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  // Already in YYYY-MM-DD (optionally with a time component).
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Excel serial date number (days since 1899-12-30).
  if (/^\d{4,6}$/.test(raw)) {
    const serial = parseInt(raw, 10);
    if (serial > 59) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  // DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY (also handles M/D or 2-digit years).
  const dmy = raw.match(/^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/);
  if (dmy) {
    let [, a, b, c] = dmy;
    let day, month, year;
    if (a.length === 4) {
      // YYYY/MM/DD
      year = a; month = b; day = c;
    } else {
      // DD/MM/YYYY
      day = a; month = b; year = c;
      if (year.length === 2) year = `20${year}`;
    }
    const dd = day.padStart(2, '0');
    const mm = month.padStart(2, '0');
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) {
      return `${year}-${mm}-${dd}`;
    }
  }

  // Last resort: let the Date parser try (handles things like "Jan 29 2026").
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

  return '';
};

const JCR = ({ onBack, onLogout }) => {
  // Common fields state
  const [formData, setFormData] = useState({
    // Header / Common Fields (Format-III)
    systemName: 'Solar Street Lighting System',
    district: '',
    rateContractNo: '',
    workOrderNo: '',
    supplierName: '',
    totalWorkOrderQty: '',
    materialSupplyDate: '',
    systemsInThisJCR: '',
    installationCompleteDate: '',
    handoverDate: '',
    
    // Equipment Specification (Format-III(a) header)
    moduleMake: '',
    moduleCapacity: '',
    luminaireMake: '',
    luminaireCapacity: '',
    batteryMake: '',
    batteryCapacity: '',
    year: new Date().getFullYear().toString(),
    
    // Material Receipt (Format-II)
    preDispatchInspectionDate: '',
    materialReceiptDate: '',
    
    // Signatures / Certification
    supplierSignatoryName: '',
    userSignatoryName: '',
    poApoName: '',
    countersignAuthority: 'Addl. Deputy Commissioner-cum-Chief Project Officer, PANCHKULA',

    // Variable fields (repeatable rows)
    installations: [],
  });

  const [currentDraft, setCurrentDraft] = useState(null);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftList, setShowDraftList] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Filter state for loading installations
  const [availableInstallations, setAvailableInstallations] = useState([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [filterWorkOrder, setFilterWorkOrder] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMessage, setFilterMessage] = useState(null);

  // Work order multi-select state
  const [workOrders, setWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [selectedWorkOrders, setSelectedWorkOrders] = useState([]);
  const [cachedInstallations, setCachedInstallations] = useState([]);

  // PDF preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load saved drafts on mount
  useEffect(() => {
    const drafts = getAllJCRDrafts();
    setSavedDrafts(drafts);

    // Check for pending import from Installation Register
    const pendingImport = getPendingJCRImport();
    if (pendingImport && pendingImport.length > 0) {
      const imported = pendingImport.map((inst, idx) => ({
        serialNo: idx + 1,
        beneficiaryName: inst.exact_location || '',
        latitude: inst.latitude || '',
        longitude: inst.longitude || '',
        photoDate: normalizeDate(inst.photo_date || inst.commissioning_date),
        villageGramPanchayat: inst.village || '',
        block: inst.block || '',
        assemblyConstituency: inst.assembly_constituency || '',
        commissioningDate: normalizeDate(inst.commissioning_date),
        moduleSerialNo: inst.module_serial || '',
        batterySerialNo: inst.battery_serial || '',
        luminaireSerialNo: inst.luminaire_serial || '',
        rms: inst.rms || 'YES',
      }));
      
      setFormData(prev => ({
        ...prev,
        installations: imported,
        systemsInThisJCR: imported.length.toString(),
      }));
      
      setFilterMessage({
        type: 'success',
        text: `✓ Auto-imported ${imported.length} installation(s) from Installation Register!`
      });
    }
  }, []);

  // Mark unsaved changes
  useEffect(() => {
    setUnsavedChanges(true);
  }, [formData]);

  // Revoke preview blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Update installations array when systemsInThisJCR changes
  useEffect(() => {
    const count = parseInt(formData.systemsInThisJCR) || 0;
    if (count > 0 && formData.installations.length !== count) {
      const newInstallations = Array.from({ length: count }, (_, i) => {
        // Keep existing data if available
        if (formData.installations[i]) {
          return formData.installations[i];
        }
        // Create new empty row with auto-filled dates
        return {
          serialNo: i + 1,
          beneficiaryName: '',
          latitude: '',
          longitude: '',
          photoDate: formData.installationCompleteDate || '',
          villageGramPanchayat: '',
          block: '',
          assemblyConstituency: '',
          commissioningDate: formData.installationCompleteDate || '',
          moduleSerialNo: '',
          batterySerialNo: '',
          luminaireSerialNo: '',
          rms: 'YES',
        };
      });
      setFormData(prev => ({ ...prev, installations: newInstallations }));
    }
  }, [formData.systemsInThisJCR, formData.installationCompleteDate]);

  // Load work orders (and cache all installations) for the dropdown fetch mode.
  const loadWorkOrders = useCallback(async () => {
    setLoadingWorkOrders(true);
    try {
      const [wos, insts] = await Promise.all([
        fetchWorkOrders(),
        fetchInstallations(),
      ]);
      setWorkOrders(wos);
      setCachedInstallations(insts);
    } catch (err) {
      console.error('Failed to load work orders:', err);
      setFilterMessage({ type: 'error', text: `Failed to load work orders: ${err.message}` });
    } finally {
      setLoadingWorkOrders(false);
    }
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  // Build the list of selectable work orders by combining the work_orders
  // table (names + order numbers) with any work_order values present on the
  // installation records themselves, so nothing is missed.
  const workOrderOptions = useMemo(() => {
    const set = new Set();
    for (const wo of workOrders) {
      if (wo.name) set.add(String(wo.name).trim());
      for (const num of wo.order_numbers || []) {
        if (num) set.add(String(num).trim());
      }
    }
    for (const inst of cachedInstallations) {
      if (inst.work_order) set.add(String(inst.work_order).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [workOrders, cachedInstallations]);

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

  const handleCommonFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // The Work Order No. field supports BOTH checkbox multi-select and free text.
  // `formData.workOrderNo` is the comma-separated source of truth; the typed
  // value is split into individual work orders which mirror into the "Load
  // Installation Data" filter so the same selection is used everywhere.
  const handleWorkOrderNoChange = (value) => {
    setFormData(prev => ({ ...prev, workOrderNo: value }));
    const parts = value
      .split(/\r?\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
    setSelectedWorkOrders(parts);
    setShowFilters(true);
  };

  const handleInstallationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      installations: prev.installations.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      ),
    }));
  };

  const addInstallationRow = () => {
    const newRow = {
      serialNo: formData.installations.length + 1,
      beneficiaryName: '',
      latitude: '',
      longitude: '',
      photoDate: formData.installationCompleteDate || '',
      villageGramPanchayat: '',
      block: '',
      assemblyConstituency: '',
      commissioningDate: formData.installationCompleteDate || '',
      moduleSerialNo: '',
      batterySerialNo: '',
      luminaireSerialNo: '',
      rms: 'YES',
    };
    setFormData(prev => ({
      ...prev,
      installations: [...prev.installations, newRow],
      systemsInThisJCR: (prev.installations.length + 1).toString(),
    }));
  };

  const removeInstallationRow = (index) => {
    if (window.confirm('Remove this installation row?')) {
      setFormData(prev => ({
        ...prev,
        installations: prev.installations
          .filter((_, i) => i !== index)
          .map((inst, i) => ({ ...inst, serialNo: i + 1 })),
        systemsInThisJCR: (prev.installations.length - 1).toString(),
      }));
    }
  };

  // Load installations from database with filters.
  // Two fetch paths are honored together:
  //   1. The selected work orders from the dropdown (multi-select).
  //   2. The free-text Work Order / Location filters.
  const handleLoadInstallations = useCallback(async () => {
    setLoadingInstallations(true);
    setFilterMessage(null);
    try {
      // Reuse the cached installations if available; otherwise fetch fresh.
      const allInstallations = cachedInstallations.length > 0
        ? cachedInstallations
        : await fetchInstallations();
      
      // Apply filters
      let filtered = allInstallations;

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
      }
      
      if (filterWorkOrder.trim()) {
        const woQuery = filterWorkOrder.toLowerCase().trim();
        filtered = filtered.filter(inst => 
          inst.work_order && String(inst.work_order).toLowerCase().includes(woQuery)
        );
      }
      
      if (filterLocation.trim()) {
        const locQuery = filterLocation.toLowerCase().trim();
        filtered = filtered.filter(inst => 
          (inst.exact_location && String(inst.exact_location).toLowerCase().includes(locQuery)) ||
          (inst.village && String(inst.village).toLowerCase().includes(locQuery)) ||
          (inst.block && String(inst.block).toLowerCase().includes(locQuery)) ||
          (inst.assembly_constituency && String(inst.assembly_constituency).toLowerCase().includes(locQuery))
        );
      }
      
      setAvailableInstallations(filtered);
      setFilterMessage({ 
        type: 'success', 
        text: `Found ${filtered.length} installation(s) matching your selection.` 
      });
      
    } catch (err) {
      console.error('Failed to load installations:', err);
      setFilterMessage({ type: 'error', text: `Failed to load: ${err.message}` });
    } finally {
      setLoadingInstallations(false);
    }
  }, [filterWorkOrder, filterLocation, selectedWorkOrders, cachedInstallations, workOrderAliases]);

  // Import selected installations into JCR form
  const handleImportInstallations = useCallback((selectedIds) => {
    const idSet = new Set(selectedIds.map(String));
    const selected = availableInstallations.filter(inst =>
      idSet.has(String(inst.id))
    );

    if (selected.length === 0) {
      setFilterMessage({ type: 'error', text: 'No installations selected to import.' });
      return;
    }

    // Map installation records to JCR installation format. `serialNo` is not
    // assigned here; it is set during the merge step below.
    const mapped = selected.map((inst) => ({
      beneficiaryName: inst.exact_location || '',
      latitude: inst.latitude || '',
      longitude: inst.longitude || '',
      photoDate: normalizeDate(inst.photo_date || inst.commissioning_date),
      villageGramPanchayat: inst.village || '',
      block: inst.block || '',
      assemblyConstituency: inst.assembly_constituency || '',
      commissioningDate: normalizeDate(inst.commissioning_date),
      moduleSerialNo: inst.module_serial || '',
      batterySerialNo: inst.battery_serial || '',
      luminaireSerialNo: inst.luminaire_serial || '',
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

  // Toggle a work order in/out of the multi-select set. Keep the Project
  // Information Work Order field in sync: it mirrors ALL selected work orders
  // as a comma-separated string so both places always agree.
  const toggleWorkOrder = useCallback((wo) => {
    setSelectedWorkOrders(prev => {
      const next = prev.includes(wo) ? prev.filter(w => w !== wo) : [...prev, wo];
      setFormData(f => ({ ...f, workOrderNo: next.join('\n') }));
      return next;
    });
  }, []);

  // Whenever the selected work order(s) change and installations are cached,
  // auto-load the matching installation rows so the filter results reflect the
  // current selection without an extra click.
  useEffect(() => {
    if (selectedWorkOrders.length > 0 && cachedInstallations.length > 0) {
      handleLoadInstallations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkOrders, cachedInstallations]);

  const handleSaveDraft = () => {
    const draftId = currentDraft || `draft_${Date.now()}`;
    const success = saveJCRDraft(draftId, formData);
    if (success) {
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      const drafts = getAllJCRDrafts();
      setSavedDrafts(drafts);
      alert('Draft saved successfully!');
    } else {
      alert('Failed to save draft. Please try again.');
    }
  };

  const handleLoadDraft = (draftId) => {
    const draft = loadJCRDraft(draftId);
    if (draft) {
      setFormData(draft.data);
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      setShowDraftList(false);
    }
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Delete this draft permanently?')) {
      deleteJCRDraft(draftId);
      const drafts = getAllJCRDrafts();
      setSavedDrafts(drafts);
      if (currentDraft === draftId) {
        setCurrentDraft(null);
      }
    }
  };

  // Fill the form with random test data (50 installations) to preview the PDF.
  const handleFillTestData = () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pad = (n, len) => String(n).padStart(len, '0');
    const randDate = () => {
      const d = new Date(2025, randInt(0, 11), randInt(1, 28));
      return d.toISOString().split('T')[0];
    };

    const districts = ['AMBALA', 'PANCHKULA', 'YAMUNANAGAR', 'KURUKSHETRA', 'KARNAL'];
    const blocks = ['NARAINGARH', 'BARARA', 'SAHA', 'SHAHZADPUR', 'MULLANA'];
    const villages = ['KANJALA', 'BARWALA', 'RAIPUR', 'MANAKPUR', 'DHIN', 'GARNALA', 'KESRI'];
    const assemblies = ['NARAINGARH', 'AMBALA CITY', 'MULLANA (SC)', 'SADHAURA (SC)'];
    const names = ['Ram Kumar', 'Suresh Devi', 'Anil Sharma', 'Village Panchayat', 'Govt. School', 'Community Center', 'Rajesh Singh', 'Sunita Rani'];

    const count = 50;
    const installations = Array.from({ length: count }, (_, i) => ({
      serialNo: i + 1,
      beneficiaryName: `${pick(names)} (${pick(villages)})`,
      latitude: (30 + Math.random()).toFixed(6),
      longitude: (76 + Math.random()).toFixed(6),
      photoDate: randDate(),
      villageGramPanchayat: pick(villages),
      block: pick(blocks),
      assemblyConstituency: pick(assemblies),
      commissioningDate: randDate(),
      moduleSerialNo: `MOD-${pad(randInt(1, 99999), 5)}`,
      batterySerialNo: `BAT-${pad(randInt(1, 99999), 5)}`,
      luminaireSerialNo: `LUM-${pad(randInt(1, 99999), 5)}`,
      rms: pick(['YES', 'YES', 'NO']),
    }));

    setFormData(prev => ({
      ...prev,
      systemName: 'Solar Street Lighting System',
      district: `${pick(districts)} (BLOCK: ${pick(blocks)}, VILLAGE: ${pick(villages)})`,
      rateContractNo: `119/HR/RC/E-5/2025-26/${randInt(10000, 99999)} dated 29.01.2026`,
      workOrderNo: `DNRE/2025-2026/${randInt(10000, 99999)} DATED: 18/02/2026`,
      supplierName: 'M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, 527, FIFTH FLOOR, SECTOR-17, PANCHKULA, HARYANA - 134109',
      totalWorkOrderQty: String(randInt(50, 200)),
      materialSupplyDate: randDate(),
      systemsInThisJCR: String(count),
      installationCompleteDate: randDate(),
      handoverDate: randDate(),
      moduleMake: pick(['SENZA (SUN AND SAND EXIM)', 'JAKSON', 'WAAREE']),
      moduleCapacity: pick(['75', '100', '125']),
      luminaireMake: pick(['RITIKA', 'BAJAJ', 'CROMPTON']),
      luminaireCapacity: pick(['12', '15', '20']),
      batteryMake: pick(['SUNFEED', 'EXIDE', 'AMARON']),
      batteryCapacity: pick(['384', '480', '512']),
      year: '2026',
      preDispatchInspectionDate: randDate(),
      materialReceiptDate: randDate(),
      installations,
    }));

    setFilterMessage({ type: 'success', text: `✓ Filled test data with ${count} random installations.` });
  };

  const handleNewForm = () => {
    if (unsavedChanges) {
      if (!window.confirm('You have unsaved changes. Start a new form anyway?')) {
        return;
      }
    }
    setFormData({
      systemName: 'Solar Street Lighting System',
      district: '',
      rateContractNo: '',
      workOrderNo: '',
      supplierName: '',
      totalWorkOrderQty: '',
      materialSupplyDate: '',
      systemsInThisJCR: '',
      installationCompleteDate: '',
      handoverDate: '',
      moduleMake: '',
      moduleCapacity: '',
      luminaireMake: '',
      luminaireCapacity: '',
      batteryMake: '',
      batteryCapacity: '',
      year: new Date().getFullYear().toString(),
      preDispatchInspectionDate: '',
      materialReceiptDate: '',
      supplierSignatoryName: '',
      userSignatoryName: '',
      poApoName: '',
      countersignAuthority: 'Addl. Deputy Commissioner-cum-Chief Project Officer, PANCHKULA',
      installations: [],
    });
    setCurrentDraft(null);
    setUnsavedChanges(false);
  };

  // Validate the form before generating/previewing. Returns true if OK.
  const validateForm = () => {
    const requiredFields = [
      { field: 'district', label: 'District' },
      { field: 'workOrderNo', label: 'Work Order No.' },
      { field: 'supplierName', label: 'Supplier Name' },
      { field: 'systemsInThisJCR', label: 'No. of Systems' },
    ];

    const missing = requiredFields.filter(({ field }) => !formData[field]);
    if (missing.length > 0) {
      alert(`Please fill required fields: ${missing.map(m => m.label).join(', ')}`);
      return false;
    }

    if (formData.installations.length === 0) {
      alert('Please add at least one installation entry.');
      return false;
    }

    const incompleteRows = formData.installations.filter(
      inst => !inst.beneficiaryName || !inst.villageGramPanchayat
    );

    if (incompleteRows.length > 0) {
      const proceed = window.confirm(
        `${incompleteRows.length} installation row(s) have incomplete data. Continue anyway?`
      );
      if (!proceed) return false;
    }

    return true;
  };

  // Open a side preview of the generated PDF
  const handlePreviewPDF = async () => {
    if (!validateForm()) return;

    setGenerating(true);
    try {
      // Clean up any previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const result = await generateJCRPreview(formData);
      if (result.success) {
        setPreviewUrl(result.url);
        setShowPreview(true);
      } else {
        alert(`Failed to generate preview: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to generate preview: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleGeneratePDF = async () => {
    if (!validateForm()) return;

    setGenerating(true);
    try {
      const result = await generateJCRPDF(formData);

      if (result.success) {
        alert(`PDF generated successfully!\nFilename: ${result.filename}`);
        if (unsavedChanges) {
          const save = window.confirm('Would you like to save this form as a draft?');
          if (save) {
            handleSaveDraft();
          }
        }
      } else {
        alert(`Failed to generate PDF: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="jcr-container">
      <div className="jcr-nav">
        <button className="nav-btn" onClick={onBack} title="Back to Dashboard">
          ← Back
        </button>
        <div className="nav-spacer"></div>
        {onLogout && (
          <button className="nav-btn logout" onClick={onLogout} title="Logout">
            Logout
          </button>
        )}
      </div>

      <div className="jcr-header">
        <div className="jcr-logo-section">
          <img 
            src="/SUNFEED LOGO.png" 
            alt="Sunfeed Logo" 
            className="jcr-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="jcr-title-section">
          <h1 className="jcr-title">Joint Commissioning Report (JCR)</h1>
          <p className="jcr-subtitle">Solar Street Lighting System Installation Documentation</p>
        </div>
        
        <div className="jcr-actions">
          <button
            className="btn btn-secondary"
            onClick={handleNewForm}
            title="Start a new form"
          >
            <span className="btn-icon">+</span> New Form
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleFillTestData}
            title="Fill all fields with 50 random test records to preview the PDF"
          >
            <span className="btn-icon">🎲</span> Fill Test Data
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowDraftList(!showDraftList)}
            title="Load saved draft"
          >
            <span className="btn-icon">📁</span> Load Draft ({savedDrafts.length})
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleSaveDraft}
            title="Save current form as draft"
          >
            <span className="btn-icon">💾</span> Save Draft
            {unsavedChanges && <span className="unsaved-indicator">*</span>}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handlePreviewPDF}
            disabled={generating}
            title="Preview PDF before download"
          >
            <span className="btn-icon">👁️</span> {generating ? 'Working...' : 'Preview PDF'}
          </button>

          <button
            className="btn btn-success"
            onClick={handleGeneratePDF}
            disabled={generating}
            title="Generate PDF document"
          >
            <span className="btn-icon">📄</span> {generating ? 'Working...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {showPreview && previewUrl && (
        <div className="jcr-preview-overlay" onClick={handleClosePreview}>
          <div className="jcr-preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="jcr-preview-header">
              <h3>PDF Preview</h3>
              <div className="jcr-preview-actions">
                <button className="btn btn-success btn-small" onClick={handleGeneratePDF}>
                  ⬇ Download
                </button>
                <button className="btn btn-secondary btn-small" onClick={handleClosePreview}>
                  ✕ Close
                </button>
              </div>
            </div>
            <iframe
              title="JCR PDF Preview"
              src={previewUrl}
              className="jcr-preview-frame"
            />
          </div>
        </div>
      )}

      {showDraftList && savedDrafts.length > 0 && (
        <div className="draft-list">
          <h3>Saved Drafts</h3>
          {savedDrafts.map(draft => (
            <div key={draft.id} className="draft-item">
              <div className="draft-info">
                <span className="draft-name">{draft.preview}</span>
                <span className="draft-date">
                  {new Date(draft.savedAt).toLocaleString()}
                </span>
              </div>
              <div className="draft-actions">
                <button
                  className="btn-small btn-primary"
                  onClick={() => handleLoadDraft(draft.id)}
                >
                  Load
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDeleteDraft(draft.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="jcr-form" onSubmit={(e) => e.preventDefault()}>
        {/* Section 1: Header / Common Fields */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">1</span>
            Project Information
            <span className="format-tag">Format-III</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="jcr.systemName"
                value={formData.systemName}
                onChange={(value) => handleCommonFieldChange('systemName', value)}
                label="Name of System"
                required
              />
            </div>

            <div className="form-field">
              <label className="combobox-label">
                District / Block / Village <span className="required-star">*</span>
              </label>
              <textarea
                value={formData.district}
                onChange={(e) => handleCommonFieldChange('district', e.target.value)}
                placeholder={'One per line:\nAMBALA (BLOCK: NARAINGARH, VILLAGE: KANJALA)\nPANCHKULA (BLOCK: BARWALA, VILLAGE: RAIPUR)'}
                className="filter-input"
                style={{ minHeight: '72px', resize: 'vertical' }}
                rows={3}
                required
              />
            </div>

            <div className="form-field">
              <label className="combobox-label">Rate Contract No. &amp; Date</label>
              <textarea
                value={formData.rateContractNo}
                onChange={(e) => handleCommonFieldChange('rateContractNo', e.target.value)}
                placeholder={'One per line:\n119/HR/RC/E-5/2025-26/15124 dated 29.01.2026'}
                className="filter-input"
                style={{ minHeight: '72px', resize: 'vertical' }}
                rows={3}
              />
            </div>

            <div className="form-field full-width">
              <label className="combobox-label">
                Work Order No. & Date <span className="required-star">*</span>
                <span className="wo-select-count">
                  {selectedWorkOrders.length > 0 ? ` · ${selectedWorkOrders.length} selected` : ''}
                </span>
                {loadingWorkOrders && <span className="wo-select-count"> · loading…</span>}
              </label>

              {/* Pick one or more work orders. Selections sync with the Load
                  Installation Data filter below. */}
              <div className="wo-multiselect">
                {workOrderOptions.length === 0 && !loadingWorkOrders && (
                  <p className="filter-info" style={{ margin: 0 }}>No work orders found.</p>
                )}
                {workOrderOptions.map((wo) => (
                  <label key={wo} className="wo-option">
                    <input
                      type="checkbox"
                      checked={selectedWorkOrders.includes(wo)}
                      onChange={() => toggleWorkOrder(wo)}
                    />
                    <span>{wo}</span>
                  </label>
                ))}
              </div>

              {/* Free-text entry for custom work order numbers not in the list.
                  Put each work order on its own line — they render on separate
                  lines in the PDF. */}
              <textarea
                value={formData.workOrderNo}
                onChange={(e) => handleWorkOrderNoChange(e.target.value)}
                placeholder={'Or type work order no(s), one per line:\nDNRE/2025-2026/10521\nDNRE/2025-2026/10522'}
                className="filter-input"
                style={{ marginTop: '8px', minHeight: '72px', resize: 'vertical' }}
                rows={3}
                required
              />
            </div>

            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="jcr.supplierName"
                value={formData.supplierName}
                onChange={(value) => handleCommonFieldChange('supplierName', value)}
                label="Name & Address of Supplier"
                placeholder="e.g., M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, 527, FIFTH FLOOR..."
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.totalWorkOrderQty"
                value={formData.totalWorkOrderQty}
                onChange={(value) => handleCommonFieldChange('totalWorkOrderQty', value)}
                label="Total Work Order Quantity (nos.)"
                type="number"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.systemsInThisJCR"
                value={formData.systemsInThisJCR}
                onChange={(value) => handleCommonFieldChange('systemsInThisJCR', value)}
                label="No. of Systems in this JCR (nos.)"
                type="number"
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.materialSupplyDate"
                value={formData.materialSupplyDate}
                onChange={(value) => handleCommonFieldChange('materialSupplyDate', value)}
                label="Date of Supply of Material"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.installationCompleteDate"
                value={formData.installationCompleteDate}
                onChange={(value) => handleCommonFieldChange('installationCompleteDate', value)}
                label="Date of Complete Installation & Commissioning"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.handoverDate"
                value={formData.handoverDate}
                onChange={(value) => handleCommonFieldChange('handoverDate', value)}
                label="Date of Handing Over to Beneficiary"
                type="date"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Equipment Specification */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">2</span>
            Equipment Specifications
            <span className="format-tag">Format-III(a)</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.moduleMake"
                value={formData.moduleMake}
                onChange={(value) => handleCommonFieldChange('moduleMake', value)}
                label="Make of Module"
                placeholder="e.g., SENZA (SUN AND SAND EXIM)"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.moduleCapacity"
                value={formData.moduleCapacity}
                onChange={(value) => handleCommonFieldChange('moduleCapacity', value)}
                label="Capacity of PV Module (Wp)"
                placeholder="e.g., 75"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.luminaireMake"
                value={formData.luminaireMake}
                onChange={(value) => handleCommonFieldChange('luminaireMake', value)}
                label="Make of Luminaire"
                placeholder="e.g., RITIKA"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.luminaireCapacity"
                value={formData.luminaireCapacity}
                onChange={(value) => handleCommonFieldChange('luminaireCapacity', value)}
                label="Capacity of Luminaire (W)"
                placeholder="e.g., 12"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.batteryMake"
                value={formData.batteryMake}
                onChange={(value) => handleCommonFieldChange('batteryMake', value)}
                label="Make of Battery"
                placeholder="e.g., SUNFEED"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.batteryCapacity"
                value={formData.batteryCapacity}
                onChange={(value) => handleCommonFieldChange('batteryCapacity', value)}
                label="Capacity of Battery (Wh)"
                placeholder="e.g., 384"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.year"
                value={formData.year}
                onChange={(value) => handleCommonFieldChange('year', value)}
                label="Year"
                placeholder="e.g., 2026"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Material Receipt */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">3</span>
            Material Receipt Information
            <span className="format-tag">Format-II</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.preDispatchInspectionDate"
                value={formData.preDispatchInspectionDate}
                onChange={(value) => handleCommonFieldChange('preDispatchInspectionDate', value)}
                label="Date of Pre-dispatch Inspection"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.materialReceiptDate"
                value={formData.materialReceiptDate}
                onChange={(value) => handleCommonFieldChange('materialReceiptDate', value)}
                label="Date of Receipt of Material"
                type="date"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Signatures */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">4</span>
            Certification & Signatures
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.supplierSignatoryName"
                value={formData.supplierSignatoryName}
                onChange={(value) => handleCommonFieldChange('supplierSignatoryName', value)}
                label="Authorized Signatory (Supplier)"
                placeholder="Name and designation"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.userSignatoryName"
                value={formData.userSignatoryName}
                onChange={(value) => handleCommonFieldChange('userSignatoryName', value)}
                label="Signature of User (Village Level)"
                placeholder="Sarpanch / Gram Panchayat representative"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.poApoName"
                value={formData.poApoName}
                onChange={(value) => handleCommonFieldChange('poApoName', value)}
                label="Signature of PO/APO"
                placeholder="Project Officer / Assistant Project Officer"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.countersignAuthority"
                value={formData.countersignAuthority}
                onChange={(value) => handleCommonFieldChange('countersignAuthority', value)}
                label="Countersigned By"
                placeholder="Chief Project Officer"
              />
            </div>
          </div>
        </section>

        {/* Installation Data Filters - Load from Installation Register */}
        <section className="form-section">
          <div className="filter-header">
            <h2 className="section-title">
              <span className="section-icon">🔍</span>
              Load Installation Data
            </h2>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <p className="filter-info">
                Load installation data from the Installation Register. You can either:<br/>
                <strong>Way #1:</strong> Select one or more Work Orders from the dropdown below, OR<br/>
                <strong>Way #2:</strong> Type into the text filters (Work Order Number / Location).
              </p>

              {/* Way #2: Work order multi-select dropdown */}
              <div className="form-field full-width">
                <label>
                  Select Work Order(s)
                  <span className="wo-select-count">
                    {selectedWorkOrders.length > 0 ? ` · ${selectedWorkOrders.length} selected` : ''}
                  </span>
                  {loadingWorkOrders && <span className="wo-select-count"> · loading…</span>}
                </label>
                <div className="wo-multiselect">
                  {workOrderOptions.length === 0 && !loadingWorkOrders && (
                    <p className="filter-info" style={{ margin: 0 }}>No work orders found.</p>
                  )}
                  {workOrderOptions.map((wo) => (
                    <label key={wo} className="wo-option">
                      <input
                        type="checkbox"
                        checked={selectedWorkOrders.includes(wo)}
                        onChange={() => toggleWorkOrder(wo)}
                      />
                      <span>{wo}</span>
                    </label>
                  ))}
                </div>
                {selectedWorkOrders.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => setSelectedWorkOrders([])}
                    style={{ marginTop: '8px' }}
                  >
                    Clear selected work orders
                  </button>
                )}
              </div>
              
              <div className="form-grid">
                <div className="form-field">
                  <label>Filter by Work Order Number</label>
                  <input
                    type="text"
                    value={filterWorkOrder}
                    onChange={(e) => setFilterWorkOrder(e.target.value)}
                    placeholder="e.g., WO/2026/00123 or part of it"
                    className="filter-input"
                  />
                </div>

                <div className="form-field">
                  <label>Filter by Location</label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="Village, Block, Assembly, or Exact Location"
                    className="filter-input"
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleLoadInstallations}
                  disabled={loadingInstallations}
                >
                  <Search size={16} />
                  {loadingInstallations ? 'Searching...' : 'Search Installations'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterWorkOrder('');
                    setFilterLocation('');
                    setAvailableInstallations([]);
                    setFilterMessage(null);
                  }}
                >
                  Clear Filters
                </button>
              </div>

              {filterMessage && (
                <div className={`filter-message ${filterMessage.type}`}>
                  {filterMessage.text}
                </div>
              )}

              {availableInstallations.length > 0 && (
                <div className="installation-results">
                  <h3 className="results-title">
                    Available Installations ({availableInstallations.length})
                  </h3>
                  <div className="results-table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                const checkboxes = document.querySelectorAll('.install-checkbox');
                                checkboxes.forEach(cb => cb.checked = e.target.checked);
                              }}
                              title="Select all"
                            />
                          </th>
                          <th>S.No</th>
                          <th>Work Order</th>
                          <th>Location</th>
                          <th>Village</th>
                          <th>Block</th>
                          <th>Assembly</th>
                          <th>Module #</th>
                          <th>Battery #</th>
                          <th>Luminaire #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableInstallations.map((inst) => (
                          <tr key={inst.id}>
                            <td>
                              <input
                                type="checkbox"
                                className="install-checkbox"
                                data-id={inst.id}
                              />
                            </td>
                            <td>{inst.sno || '-'}</td>
                            <td>{inst.work_order || '-'}</td>
                            <td>{inst.exact_location || '-'}</td>
                            <td>{inst.village || '-'}</td>
                            <td>{inst.block || '-'}</td>
                            <td>{inst.assembly_constituency || '-'}</td>
                            <td>{inst.module_serial || '-'}</td>
                            <td>{inst.battery_serial || '-'}</td>
                            <td>{inst.luminaire_serial || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      const selected = Array.from(
                        document.querySelectorAll('.install-checkbox:checked')
                      ).map(cb => cb.dataset.id);
                      handleImportInstallations(selected);
                    }}
                    style={{ marginTop: '12px' }}
                  >
                    Import Selected to JCR
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 5: Installation Sites Table */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">5</span>
            Site-wise Installation List
            <span className="format-tag">Format-III(a) Table</span>
          </h2>
          
          <InstallationTable
            installations={formData.installations}
            onChange={handleInstallationChange}
            onAddRow={addInstallationRow}
            onRemoveRow={removeInstallationRow}
            commonData={{
              installationCompleteDate: formData.installationCompleteDate,
            }}
          />
        </section>

      </form>
    </div>
  );
};

export default JCR;
