import React, { useState, useEffect, useRef } from 'react';
import ComboboxWithHistory from './ComboboxWithHistory';
import { saveJCRDraft, loadJCRDraft, getAllJCRDrafts, deleteJCRDraft } from '../utils/jcrStorage';
import { generateMaterialPDF, generateMaterialPreview, exportMaterialExcel, importMaterialExcel } from '../utils/materialPdfGenerator';
import './MaterialReport.css';

const DRAFT_PREFIX = 'material_';

const emptyItem = () => ({
  sno: '',
  moduleSerial: '',
  moduleMake: '',
  batterySerial: '',
  batteryMake: '',
  luminaireSerial: '',
  luminaireMake: '',
});

const initialFormData = () => ({
  // Header fields (shared by Format-II and Format-II(a))
  district: '',
  rateContractNo: '',
  workOrderNo: '',
  materialReceiptSystems: '',
  preDispatchInspectionDate: '',
  materialReceiptDate: '',
  invoiceNoDate: '',
  siteName: '',
  supplierName: '',

  // Signatures
  supplierSignatoryName: '',
  poApoName: '',

  // Manual page numbers stamped (bottom-right) onto the generated PDF pages,
  // in order. Each: { id, label }. Added via the "+" button in the UI.
  pageNumbers: [],

  // Format-II(a) material list rows
  materialItems: [emptyItem()],
});

const MaterialReport = ({ onBack, onLogout }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftList, setShowDraftList] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState(null);
  const importFileRef = useRef(null);

  // Load saved drafts (filtered to material drafts) on mount
  useEffect(() => {
    const all = getAllJCRDrafts().filter((d) => String(d.id).startsWith(DRAFT_PREFIX));
    setSavedDrafts(all);
  }, []);

  // Clean up the preview blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  // ===== Manual page-number handlers (mirror of the PDI/JCR feature) =====
  // "+" appends a new label pre-filled with the next sequential number. Each
  // label is stamped (bottom-right) onto the matching page of the PDF.
  const addPageNumber = () => {
    setFormData((prev) => {
      const list = prev.pageNumbers || [];
      return {
        ...prev,
        pageNumbers: [
          ...list,
          { id: list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1, label: String(list.length + 1) },
        ],
      };
    });
    setUnsavedChanges(true);
  };
  const removePageNumber = (id) => {
    setFormData((prev) => ({
      ...prev,
      pageNumbers: (prev.pageNumbers || []).filter((p) => p.id !== id),
    }));
    setUnsavedChanges(true);
  };
  const updatePageNumber = (id, label) => {
    setFormData((prev) => ({
      ...prev,
      pageNumbers: (prev.pageNumbers || []).map((p) => (p.id === id ? { ...p, label } : p)),
    }));
    setUnsavedChanges(true);
  };

  /* ----------------------------- Item rows ----------------------------- */
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = prev.materialItems.map((it, i) =>
        i === index ? { ...it, [field]: value } : it
      );
      return { ...prev, materialItems: items };
    });
    setUnsavedChanges(true);
  };

  const addItemRow = () => {
    setFormData((prev) => ({ ...prev, materialItems: [...prev.materialItems, emptyItem()] }));
    setUnsavedChanges(true);
  };

  const removeItemRow = (index) => {
    setFormData((prev) => {
      const items = prev.materialItems.filter((_, i) => i !== index);
      return { ...prev, materialItems: items.length ? items : [emptyItem()] };
    });
    setUnsavedChanges(true);
  };

  /* ----------------------------- Drafts -------------------------------- */
  const handleSaveDraft = () => {
    const draftId = currentDraft || `${DRAFT_PREFIX}${Date.now()}`;
    const success = saveJCRDraft(draftId, formData);
    if (success) {
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      setSavedDrafts(getAllJCRDrafts().filter((d) => String(d.id).startsWith(DRAFT_PREFIX)));
      setMessage({ type: 'success', text: 'Draft saved successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save draft. Please try again.' });
    }
  };

  const handleLoadDraft = (draftId) => {
    const draft = loadJCRDraft(draftId);
    if (draft) {
      setFormData({ ...initialFormData(), ...draft.data });
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      setShowDraftList(false);
    }
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Delete this draft permanently?')) {
      deleteJCRDraft(draftId);
      setSavedDrafts(getAllJCRDrafts().filter((d) => String(d.id).startsWith(DRAFT_PREFIX)));
      if (currentDraft === draftId) setCurrentDraft(null);
    }
  };

  const handleNewForm = () => {
    if (unsavedChanges && !window.confirm('You have unsaved changes. Start a new form anyway?')) {
      return;
    }
    setFormData(initialFormData());
    setCurrentDraft(null);
    setUnsavedChanges(false);
  };

  // Fill the form with random test data to quickly preview the PDF.
  const handleFillTestData = () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pad = (n, len) => String(n).padStart(len, '0');
    const randDate = () => {
      const d = new Date(2025, randInt(0, 11), randInt(1, 28));
      return d.toISOString().split('T')[0];
    };

    const districts = ['PANCHKULA', 'YAMUNANAGAR', 'AMBALA', 'KURUKSHETRA', 'KARNAL'];
    const blocks = ['BARWALA', 'NARAINGARH', 'SAHA', 'SHAHZADPUR', 'MULLANA'];
    const villages = ['RAIPUR', 'KANJALA', 'MANAKPUR', 'DHIN', 'GARNALA', 'KESRI'];
    const moduleMakes = ['SENZA (SUN AND SAND EXIM)', 'JAKSON', 'WAAREE'];
    const batteryMakes = ['SUNFEED', 'EXIDE', 'AMARON'];
    const luminaireMakes = ['RITIKA', 'BAJAJ', 'CROMPTON'];

    const count = randInt(6, 12);
    const systems = count;

    const materialItems = Array.from({ length: count }, (_, i) => ({
      sno: String(i + 1),
      moduleSerial: `MOD-${pad(randInt(1, 99999), 5)}`,
      moduleMake: pick(moduleMakes),
      batterySerial: `BAT-${pad(randInt(1, 99999), 5)}`,
      batteryMake: pick(batteryMakes),
      luminaireSerial: `LUM-${pad(randInt(1, 99999), 5)}`,
      luminaireMake: pick(luminaireMakes),
    }));

    const district = pick(districts);
    const block = pick(blocks);
    const village = pick(villages);

    setFormData({
      district,
      rateContractNo: `119/HR/RC/E-5/2025-26/${randInt(10000, 99999)} dated 29.01.2026`,
      workOrderNo: `DNRE/2025-2026/${randInt(10000, 99999)} dated 18/02/2026, ${systems} nos`,
      materialReceiptSystems: String(systems),
      preDispatchInspectionDate: randDate(),
      materialReceiptDate: randDate(),
      invoiceNoDate: `INV-${pad(randInt(1, 9999), 4)} dated ${String(randInt(1, 28)).padStart(2, '0')}/02/2026`,
      siteName: `VILLAGE: ${village}, GP: ${village}, BLOCK: ${block}`,
      supplierName: 'M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, 527, FIFTH FLOOR, SECTOR-17, PANCHKULA, HARYANA - 134109',
      supplierSignatoryName: pick(['Umesh Khatter', 'Rajesh Singh', 'Anil Sharma']),
      poApoName: pick(['APO, PANCHKULA', 'PO, YAMUNANAGAR', 'APO, AMBALA']),
      materialItems,
    });
    setUnsavedChanges(true);
    setMessage({ type: 'success', text: `Filled test data with ${count} material item(s).` });
  };

  /* ----------------------------- Validation ---------------------------- */
  const validateForm = () => {
    const required = [
      { field: 'district', label: 'Name of the district' },
      { field: 'workOrderNo', label: 'Work Order (WO) No.' },
      { field: 'materialReceiptSystems', label: 'Material receipt for No. of Systems' },
      { field: 'supplierName', label: 'Name & address of Supplier' },
    ];
    const missing = required.filter(({ field }) => !formData[field]);
    if (missing.length > 0) {
      alert(`Please fill required fields: ${missing.map((m) => m.label).join(', ')}`);
      return false;
    }
    return true;
  };

  /* ----------------------------- PDF ----------------------------------- */
  const handlePreviewPDF = async () => {
    if (!validateForm()) return;
    setGenerating(true);
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      const result = await generateMaterialPreview(formData);
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
      const result = await generateMaterialPDF(formData);
      if (result.success) {
        setMessage({ type: 'success', text: `PDF generated: ${result.fileName}` });
      } else {
        alert(`Failed to generate PDF: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Export the Format-II(a) material list as a real Excel (.xlsx) file.
  const handleExportExcel = async () => {
    setGenerating(true);
    try {
      const result = await exportMaterialExcel(formData);
      if (result.success) {
        setMessage({ type: 'success', text: `Excel exported: ${result.fileName}` });
      } else {
        alert(`Failed to export Excel: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to export Excel: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Import the material list table from an Excel / CSV file. Fills
  // formData.materialItems with the parsed rows.
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setGenerating(true);
    try {
      const result = await importMaterialExcel(file);
      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          materialItems: result.items,
          // Keep the systems count in sync with the imported rows.
          materialReceiptSystems: prev.materialReceiptSystems || String(result.items.length),
        }));
        setUnsavedChanges(true);
        setMessage({ type: 'success', text: `Imported ${result.items.length} material row(s) from Excel.` });
      } else {
        alert(`Could not import file: ${result.error}`);
      }
    } catch (err) {
      alert(`Could not import file: ${err.message}`);
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
          <h1 className="jcr-title">Material Report</h1>
          <p className="jcr-subtitle">Material Receipt of Solar Street Lighting System (Format-II &amp; II(a))</p>
        </div>

        <div className="jcr-actions">
          <button className="btn btn-secondary" onClick={handleNewForm} title="Start a new form">
            <span className="btn-icon">+</span> New Form
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleFillTestData}
            title="Fill all fields with random test data to preview the PDF"
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
          <button className="btn btn-primary" onClick={handleSaveDraft} title="Save current form as draft">
            <span className="btn-icon">💾</span> Save Draft
            {unsavedChanges && <span className="unsaved-indicator">*</span>}
          </button>
          <button className="btn btn-secondary" onClick={handlePreviewPDF} disabled={generating} title="Preview PDF before download">
            <span className="btn-icon">👁️</span> {generating ? 'Working...' : 'Preview PDF'}
          </button>
          <button className="btn btn-success" onClick={handleGeneratePDF} disabled={generating} title="Generate PDF document">
            <span className="btn-icon">📄</span> {generating ? 'Working...' : 'Generate PDF'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={generating} title="Export the material list table to an Excel (.xlsx) file">
            <span className="btn-icon">📊</span> {generating ? 'Working...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`material-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {showPreview && previewUrl && (
        <div className="jcr-preview-overlay" onClick={handleClosePreview}>
          <div className="jcr-preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="jcr-preview-header">
              <h3>PDF Preview</h3>
              <div className="jcr-preview-actions">
                <button className="btn btn-success btn-small" onClick={handleGeneratePDF}>⬇ Download</button>
                <button className="btn btn-secondary btn-small" onClick={handleClosePreview}>✕ Close</button>
              </div>
            </div>
            <iframe title="Material Report PDF Preview" src={previewUrl} className="jcr-preview-frame" />
          </div>
        </div>
      )}

      {showDraftList && savedDrafts.length > 0 && (
        <div className="draft-list">
          <h3>Saved Drafts</h3>
          {savedDrafts.map((draft) => (
            <div key={draft.id} className="draft-item">
              <div className="draft-info">
                <span className="draft-name">{draft.preview}</span>
                <span className="draft-date">{new Date(draft.savedAt).toLocaleString()}</span>
              </div>
              <div className="draft-actions">
                <button className="btn-small btn-primary" onClick={() => handleLoadDraft(draft.id)}>Load</button>
                <button className="btn-small btn-danger" onClick={() => handleDeleteDraft(draft.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="jcr-form" onSubmit={(e) => e.preventDefault()}>
        {/* Section 1: Material Receipt (Format-II) */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">1</span>
            Material Receipt
            <span className="format-tag">Format-II</span>
          </h2>

          <div className="form-grid">
            <div className="form-field full-width">
              <label className="combobox-label">
                Name of the district <span className="required-star">*</span>
              </label>
              <textarea
                value={formData.district}
                onChange={(e) => handleFieldChange('district', e.target.value)}
                placeholder={'One per line:\nPANCHKULA\nYAMUNANAGAR'}
                className="filter-input"
                style={{ minHeight: '64px', resize: 'vertical' }}
                rows={2}
                required
              />
            </div>

            <div className="form-field full-width">
              <label className="combobox-label">Rate Contract No. &amp; date</label>
              <textarea
                value={formData.rateContractNo}
                onChange={(e) => handleFieldChange('rateContractNo', e.target.value)}
                placeholder={'119/HR/RC/E-5/2025-26/15124 dated 29.01.2026'}
                className="filter-input"
                style={{ minHeight: '64px', resize: 'vertical' }}
                rows={2}
              />
            </div>

            <div className="form-field full-width">
              <label className="combobox-label">
                Work Order (WO) No., date &amp; No. of Systems ordered under W.O. <span className="required-star">*</span>
              </label>
              <textarea
                value={formData.workOrderNo}
                onChange={(e) => handleFieldChange('workOrderNo', e.target.value)}
                placeholder={'One per line:\nDNRE/2025-2026/10521 dated 18/02/2026, 179 nos'}
                className="filter-input"
                style={{ minHeight: '64px', resize: 'vertical' }}
                rows={2}
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="material.receiptSystems"
                value={formData.materialReceiptSystems}
                onChange={(v) => handleFieldChange('materialReceiptSystems', v)}
                label="Material receipt for No. of Systems"
                type="number"
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="material.preDispatchInspectionDate"
                value={formData.preDispatchInspectionDate}
                onChange={(v) => handleFieldChange('preDispatchInspectionDate', v)}
                label="Date of pre-dispatch inspection of material"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="material.materialReceiptDate"
                value={formData.materialReceiptDate}
                onChange={(v) => handleFieldChange('materialReceiptDate', v)}
                label="Date of receipt of material"
                type="date"
              />
            </div>

            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="material.invoiceNoDate"
                value={formData.invoiceNoDate}
                onChange={(v) => handleFieldChange('invoiceNoDate', v)}
                label="Invoice No. & date vide which material supplied"
                placeholder="e.g., INV-00123 dated 20/02/2026"
              />
            </div>

            <div className="form-field full-width">
              <label className="combobox-label">Name of site where material supplied (Village/GP and Block)</label>
              <textarea
                value={formData.siteName}
                onChange={(e) => handleFieldChange('siteName', e.target.value)}
                placeholder={'One per line:\nVILLAGE: RAIPUR, GP: RAIPUR, BLOCK: BARWALA'}
                className="filter-input"
                style={{ minHeight: '64px', resize: 'vertical' }}
                rows={2}
              />
            </div>

            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="material.supplierName"
                value={formData.supplierName}
                onChange={(v) => handleFieldChange('supplierName', v)}
                label="Name & address of Supplier (M/s ...)"
                placeholder="e.g., M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, SECTOR-17, PANCHKULA"
                required
              />
            </div>
          </div>
        </section>

        {/* Section 2: List of Material Supplied (Format-II(a)) */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">2</span>
            List of Material Supplied
            <span className="format-tag">Format-II(a)</span>
          </h2>

          <div className="material-table-wrapper">
            <table className="material-items-table">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>S.No</th>
                  <th>Module Sr. Number</th>
                  <th>Make of Module</th>
                  <th>Battery Sr. No.</th>
                  <th>Make of Battery</th>
                  <th>Luminaire Sr. No.</th>
                  <th>Make of Luminaire</th>
                  <th style={{ width: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.materialItems.map((item, index) => (
                  <tr key={index}>
                    <td className="sno-cell">{index + 1}</td>
                    <td><input value={item.moduleSerial} onChange={(e) => handleItemChange(index, 'moduleSerial', e.target.value)} /></td>
                    <td><input value={item.moduleMake} onChange={(e) => handleItemChange(index, 'moduleMake', e.target.value)} /></td>
                    <td><input value={item.batterySerial} onChange={(e) => handleItemChange(index, 'batterySerial', e.target.value)} /></td>
                    <td><input value={item.batteryMake} onChange={(e) => handleItemChange(index, 'batteryMake', e.target.value)} /></td>
                    <td><input value={item.luminaireSerial} onChange={(e) => handleItemChange(index, 'luminaireSerial', e.target.value)} /></td>
                    <td><input value={item.luminaireMake} onChange={(e) => handleItemChange(index, 'luminaireMake', e.target.value)} /></td>
                    <td>
                      <button type="button" className="row-remove" onClick={() => removeItemRow(index)} title="Remove row">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="material-table-actions">
            <button type="button" className="btn btn-secondary add-row-btn" onClick={addItemRow}>
              <span className="btn-icon">+</span> Add Row
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => importFileRef.current?.click()}
              disabled={generating}
              title="Import the material list from an Excel (.xlsx/.xls) or CSV file"
            >
              <span className="btn-icon">📥</span> Import Excel
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              style={{ display: 'none' }}
              onChange={handleImportExcel}
            />
          </div>
        </section>

        {/* Section 3: Signatures */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">3</span>
            Signatures
          </h2>

          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="material.supplierSignatoryName"
                value={formData.supplierSignatoryName}
                onChange={(v) => handleFieldChange('supplierSignatoryName', v)}
                label="Signature of the supplier — Name"
                placeholder="Name of supplier signatory"
              />
            </div>
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="material.poApoName"
                value={formData.poApoName}
                onChange={(v) => handleFieldChange('poApoName', v)}
                label="Signature of PO/APO — Name"
                placeholder="Name of PO/APO"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Manual page numbers (bottom-right on each PDF page) */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">4</span>
            Page Numbers (Manual)
          </h2>
          <p className="material-pagenum-hint">
            Add a label for each page in the order the pages appear in the PDF.
            Use the <strong>+ Add Page Number</strong> button, then type each
            label (e.g. 1, 2, 3). Each label is printed at the bottom-right of
            its page. Leave empty to print no page numbers.
          </p>

          {(formData.pageNumbers || []).length > 0 && (
            <div className="material-pagenum-grid">
              {(formData.pageNumbers || []).map((p, idx) => (
                <div className="material-pagenum-item" key={p.id}>
                  <span className="material-pagenum-pos">Page {idx + 1}</span>
                  <input
                    type="text"
                    value={p.label}
                    onChange={(e) => updatePageNumber(p.id, e.target.value)}
                    placeholder="Label (e.g. 1)"
                  />
                  <button
                    type="button"
                    className="row-remove"
                    onClick={() => removePageNumber(p.id)}
                    title="Remove this page number"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn-secondary add-row-btn" onClick={addPageNumber}>
            <span className="btn-icon">+</span> Add Page Number
          </button>
        </section>
      </form>
    </div>
  );
};

export default MaterialReport;
