import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft, LogOut, Search, RefreshCw, Download, Printer,
  ChevronDown, X, FileText, AlertCircle, Package,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2,
  Pencil, Check, CheckCircle2
} from 'lucide-react';
import {
  updateInstallation,
  setInstallationsRms,
  deleteInstallation,
} from '../utils/installations';
import Logo from './Logo';
import {
  fetchRMSNotEnteredRecords,
  fetchAllRMSNotEnteredRecords,
  calculateRMSStats,
  extractFilterOptions,
  formatRecordForExport
} from '../utils/rmsReport';
import './RMSNotEnteredReport.css';

const PAGE_SIZE = 100;

function RMSNotEnteredReport({ onBack, onLogout }) {
  // Data state
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    project: '',
    workOrder: '',
    block: '',
    creator: '',
    rmsStatus: 'NO' // Default to showing only RMS NO records
  });
  const [openFilter, setOpenFilter] = useState(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Selection and deletion state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteClickCount, setDeleteClickCount] = useState(0);
  const [deleteTimer, setDeleteTimer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Bulk "mark RMS = YES" state
  const [markingRms, setMarkingRms] = useState(false);

  // Statistics
  const stats = useMemo(() => calculateRMSStats(records), [records]);

  // Filter options from all loaded records
  const filterOptions = useMemo(() => extractFilterOptions(records), [records]);

  // Load records from Supabase
  const loadRecords = useCallback(async (opts = {}) => {
    const targetPage = opts.page ?? page;
    const targetSearch = opts.search ?? search;
    const targetFilters = opts.filters ?? filters;

    setLoading(true);
    setError(null);

    try {
      const { data, count } = await fetchRMSNotEnteredRecords({
        search: targetSearch,
        filters: targetFilters,
        page: targetPage,
        pageSize: PAGE_SIZE
      });

      setRecords(data);
      setTotal(count);
      setPage(targetPage);
    } catch (err) {
      console.error('Failed to load records:', err);
      setError(err.message || 'Failed to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  // Initial load
  useEffect(() => {
    loadRecords({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords({ page: 1, search });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Reload when filters change
  useEffect(() => {
    loadRecords({ page: 1, filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openFilter) return;
    const handleClick = (e) => {
      if (!e.target.closest('.filter-field')) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openFilter]);

  // Update single filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      project: '',
      workOrder: '',
      block: '',
      creator: '',
      rmsStatus: 'NO' // Keep RMS NO as default
    });
  }, []);

  // Pagination
  const goToPage = useCallback((targetPage) => {
    loadRecords({ page: targetPage });
  }, [loadRecords]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selection handlers
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === records.length && records.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  }, [records, selectedIds.size]);

  // Delete selected records with triple-click confirmation
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one record to delete.');
      return;
    }

    const newCount = deleteClickCount + 1;
    setDeleteClickCount(newCount);

    // Clear any existing timer
    if (deleteTimer) {
      clearTimeout(deleteTimer);
    }

    // Reset counter after 2 seconds of inactivity
    const timer = setTimeout(() => {
      setDeleteClickCount(0);
    }, 2000);
    setDeleteTimer(timer);

    // On third click, show confirmation
    if (newCount >= 3) {
      setDeleteClickCount(0);
      clearTimeout(timer);

      const confirmed = window.confirm(
        `⚠️ DELETE ALL SELECTED RECORDS?\n\n` +
        `You are about to permanently delete ${selectedIds.size} installation record(s).\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Click OK to proceed with deletion, or Cancel to abort.`
      );

      if (!confirmed) return;

      setDeleting(true);
      try {
        let deletedCount = 0;
        const failedIds = [];

        for (const id of selectedIds) {
          try {
            await deleteInstallation(id);
            deletedCount++;
          } catch (err) {
            console.error(`Failed to delete record ${id}:`, err);
            failedIds.push(id);
          }
        }

        if (deletedCount > 0) {
          alert(`✅ Successfully deleted ${deletedCount} record(s).${failedIds.length > 0 ? `\n\n⚠️ Failed to delete ${failedIds.length} record(s).` : ''}`);
          
          // Clear selection and reload data
          setSelectedIds(new Set());
          loadRecords({ page: 1 });
        } else {
          alert('❌ Failed to delete any records. Please try again.');
        }
      } catch (err) {
        console.error('Delete failed:', err);
        alert(`❌ Delete operation failed: ${err.message}`);
      } finally {
        setDeleting(false);
      }
    }
  }, [selectedIds, deleteClickCount, deleteTimer, loadRecords]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (deleteTimer) {
        clearTimeout(deleteTimer);
      }
    };
  }, [deleteTimer]);

  // ===== Inline edit =====
  const startEdit = useCallback((record) => {
    setEditError(null);
    setEditingId(record.id);
    setEditDraft({
      project_name: record.project_name || '',
      work_order: record.work_order || '',
      sno: record.sno || '',
      exact_location: record.exact_location || '',
      latitude: record.latitude || '',
      longitude: record.longitude || '',
      village: record.village || '',
      block: record.block || '',
      assembly_constituency: record.assembly_constituency || '',
      commissioning_date: record.commissioning_date || '',
      module_serial: record.module_serial || '',
      battery_serial: record.battery_serial || '',
      luminaire_serial: record.luminaire_serial || '',
      rms: (record.rms || '').toUpperCase() === 'YES' ? 'YES' : 'NO',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft({});
    setEditError(null);
  }, []);

  const updateDraft = useCallback((key, value) => {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateInstallation(editingId, editDraft);
      setRecords((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...(updated || editDraft) } : r))
      );
      setEditingId(null);
      setEditDraft({});
    } catch (err) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  }, [editingId, editDraft]);

  // ===== Bulk mark RMS = YES =====
  const handleMarkRmsYes = useCallback(async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one record.');
      return;
    }
    const confirmed = window.confirm(
      `Mark RMS = YES for ${selectedIds.size} selected record(s)?`
    );
    if (!confirmed) return;

    setMarkingRms(true);
    try {
      const ids = Array.from(selectedIds);
      await setInstallationsRms(ids, 'YES');
      setSelectedIds(new Set());
      // Reload so records that no longer match the "NO" filter drop out.
      await loadRecords({ page });
    } catch (err) {
      alert(`Failed to update RMS status: ${err.message}`);
    } finally {
      setMarkingRms(false);
    }
  }, [selectedIds, loadRecords, page]);

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    setExporting(true);
    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Fetch all records for export
      const allRecords = await fetchAllRMSNotEnteredRecords({ search, filters });
      
      if (allRecords.length === 0) {
        alert('No records to export.');
        return;
      }

      const exportData = allRecords.map(formatRecordForExport);
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 24 }, // Project
        { wch: 24 }, // Work Order
        { wch: 10 }, // S.No
        { wch: 20 }, // Location
        { wch: 24 }, // Coordinates
        { wch: 28 }, // Village
        { wch: 18 }, // Block
        { wch: 18 }, // Assembly
        { wch: 16 }, // Commissioned
        { wch: 22 }, // Module SN
        { wch: 22 }, // Battery SN
        { wch: 22 }, // Luminaire SN
        { wch: 20 }, // RMS Status
        { wch: 16 }, // Created
        { wch: 20 }  // Creator
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RMS Not Entered');
      
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `RMS_Not_Entered_Report_${date}.xlsx`);
      
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel export failed. Please try CSV export instead.');
    } finally {
      setExporting(false);
    }
  }, [search, filters]);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    setExporting(true);
    try {
      // Fetch all records for export
      const allRecords = await fetchAllRMSNotEnteredRecords({ search, filters });
      
      if (allRecords.length === 0) {
        alert('No records to export.');
        return;
      }

      const headers = [
        'Project', 'Work Order', 'S.No', 'Location', 'Coordinates',
        'Village / Gram Panchayat', 'Block', 'Assembly', 'Commissioned',
        'Module SN', 'Battery SN', 'Luminaire SN', 'RMS Status', 'Created', 'Creator'
      ];
      
      const escapeCSV = (value) => {
        const str = value == null ? '' : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      
      const exportData = allRecords.map(formatRecordForExport);
      const rows = exportData.map(record => 
        headers.map(h => escapeCSV(record[h]))
      );
      
      const csv = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.join(','))
      ].join('\r\n');
      
      // Add UTF-8 BOM for Excel compatibility
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `RMS_Not_Entered_Report_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('CSV export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [search, filters]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const activeFilterCount = Object.entries(filters)
    .filter(([key, value]) => key !== 'rmsStatus' && Boolean(value))
    .length;

  return (
    <div className="rms-report-page">
      <header className="rms-report-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Dashboard">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo-section">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>
                  {filters.rmsStatus === 'YES' 
                    ? 'RMS Enabled Installations' 
                    : filters.rmsStatus === 'ALL'
                    ? 'All Installations Register'
                    : 'RMS Not Entered Register'}
                </h1>
                <span className="subtitle">PDI → JCR | Solar Street Light Installation Tracking</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="rms-report-body">
        {/* Statistics Cards */}
        <section className="stats-cards">
          <StatCard
            icon={FileText}
            label="Total Records Loaded"
            value={total}
            loading={loading}
          />
          <StatCard
            icon={AlertCircle}
            label="RMS Not Entered (NO)"
            value={stats.rmsNoCount}
            variant="danger"
            loading={loading}
          />
          <StatCard
            icon={Package}
            label="Distinct Work Orders"
            value={stats.distinctProjects}
            loading={loading}
          />
        </section>

        {/* Toolbar */}
        <section className="toolbar no-print">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project, work order, village, serial number, location…"
            />
          </div>
          {selectedIds.size > 0 && (
            <button
              className="btn-action btn-rms-yes"
              onClick={handleMarkRmsYes}
              disabled={markingRms || deleting}
              title="Set RMS = YES for selected records"
            >
              <CheckCircle2 size={16} />
              {markingRms ? 'Updating…' : `Mark RMS YES (${selectedIds.size})`}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button 
              className={`btn-action btn-delete ${deleteClickCount > 0 ? 'btn-delete-active' : ''}`}
              onClick={handleDeleteSelected}
              disabled={deleting}
              title={deleteClickCount === 0 ? 'Click 3 times to delete' : deleteClickCount === 1 ? 'Click 2 more times' : 'Click 1 more time'}
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
              {deleteClickCount > 0 && <span className="click-indicator">{deleteClickCount}/3</span>}
            </button>
          )}
          <button 
            className="btn-action" 
            onClick={() => loadRecords({ page })}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button 
            className="btn-action btn-export" 
            onClick={exportToExcel}
            disabled={exporting || total === 0}
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Download Excel'}
          </button>
          <button 
            className="btn-action" 
            onClick={exportToCSV}
            disabled={exporting || total === 0}
          >
            <Download size={16} />
            Download CSV
          </button>
          <button 
            className="btn-action" 
            onClick={handlePrint}
            disabled={total === 0}
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </section>

        {/* Filters Panel */}
        <section className="filters-panel no-print">
          <h2>Search & Filter</h2>
          <div className="filters-grid">
            <FilterDropdown
              label="RMS Status"
              value={filters.rmsStatus}
              options={['ALL', 'NO', 'YES']}
              onChange={(value) => updateFilter('rmsStatus', value)}
              isOpen={openFilter === 'rmsStatus'}
              onToggle={() => setOpenFilter(openFilter === 'rmsStatus' ? null : 'rmsStatus')}
              isRmsFilter={true}
            />
            <FilterDropdown
              label="Project"
              value={filters.project}
              options={filterOptions.projects}
              onChange={(value) => updateFilter('project', value)}
              isOpen={openFilter === 'project'}
              onToggle={() => setOpenFilter(openFilter === 'project' ? null : 'project')}
            />
            <FilterDropdown
              label="Work Order"
              value={filters.workOrder}
              options={filterOptions.workOrders}
              onChange={(value) => updateFilter('workOrder', value)}
              isOpen={openFilter === 'workOrder'}
              onToggle={() => setOpenFilter(openFilter === 'workOrder' ? null : 'workOrder')}
            />
            <FilterDropdown
              label="Block"
              value={filters.block}
              options={filterOptions.blocks}
              onChange={(value) => updateFilter('block', value)}
              isOpen={openFilter === 'block'}
              onToggle={() => setOpenFilter(openFilter === 'block' ? null : 'block')}
            />
            <FilterDropdown
              label="Creator"
              value={filters.creator}
              options={filterOptions.creators}
              onChange={(value) => updateFilter('creator', value)}
              isOpen={openFilter === 'creator'}
              onToggle={() => setOpenFilter(openFilter === 'creator' ? null : 'creator')}
            />
          </div>
          {activeFilterCount > 0 && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              <X size={14} /> Clear {activeFilterCount} Filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
          <p className="filter-note">
            {filters.rmsStatus === 'NO' 
              ? 'Showing records where RMS is "NO", "N", "FALSE", "PENDING", "NOT ENTERED" or blank.'
              : filters.rmsStatus === 'YES'
              ? 'Showing records where RMS is "YES", "Y", "TRUE", or enabled.'
              : 'Showing all records regardless of RMS status.'}
          </p>
        </section>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Data Table */}
        <section className="table-panel">
          <div className="table-header">
            <h2>RMS Not Entered — Pending for PDI / JCR</h2>
            <span className="record-count">{records.length} of {total} record(s)</span>
          </div>

          <div className="table-wrapper">
            <table className="rms-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === records.length && records.length > 0}
                      onChange={toggleSelectAll}
                      title="Select all on page"
                    />
                  </th>
                  <th>Project</th>
                  <th>Work Order</th>
                  <th>S.No</th>
                  <th>Location</th>
                  <th>Coordinates</th>
                  <th>Village / Gram Panchayat</th>
                  <th>Block</th>
                  <th>Assembly</th>
                  <th>Commissioned</th>
                  <th>Module SN</th>
                  <th>Battery SN</th>
                  <th>Luminaire SN</th>
                  <th>RMS Status</th>
                  <th>Created</th>
                  <th>Creator</th>
                  <th className="action-col no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="17" className="table-message">
                      <RefreshCw size={20} className="spinning" />
                      Loading records…
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="17" className="table-message empty">
                      No records found. {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : ''}
                    </td>
                  </tr>
                ) : (
                  records.map((record) =>
                    editingId === record.id ? (
                      <tr key={record.id} className="editing-row">
                        <td className="checkbox-col"><input type="checkbox" disabled /></td>
                        <td><input className="edit-input" value={editDraft.project_name} onChange={(e) => updateDraft('project_name', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.work_order} onChange={(e) => updateDraft('work_order', e.target.value)} /></td>
                        <td><input className="edit-input narrow" value={editDraft.sno} onChange={(e) => updateDraft('sno', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.exact_location} onChange={(e) => updateDraft('exact_location', e.target.value)} /></td>
                        <td>
                          <div className="edit-coords">
                            <input className="edit-input narrow" placeholder="Lat" value={editDraft.latitude} onChange={(e) => updateDraft('latitude', e.target.value)} />
                            <input className="edit-input narrow" placeholder="Lng" value={editDraft.longitude} onChange={(e) => updateDraft('longitude', e.target.value)} />
                          </div>
                        </td>
                        <td><input className="edit-input" value={editDraft.village} onChange={(e) => updateDraft('village', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.block} onChange={(e) => updateDraft('block', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.assembly_constituency} onChange={(e) => updateDraft('assembly_constituency', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.commissioning_date} onChange={(e) => updateDraft('commissioning_date', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.module_serial} onChange={(e) => updateDraft('module_serial', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.battery_serial} onChange={(e) => updateDraft('battery_serial', e.target.value)} /></td>
                        <td><input className="edit-input" value={editDraft.luminaire_serial} onChange={(e) => updateDraft('luminaire_serial', e.target.value)} /></td>
                        <td>
                          <select className="edit-select" value={editDraft.rms} onChange={(e) => updateDraft('rms', e.target.value)}>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        </td>
                        <td>
                          {record.created_at
                            ? new Date(record.created_at).toLocaleDateString('en-GB')
                            : '—'}
                        </td>
                        <td>{record.submitted_by || '—'}</td>
                        <td className="action-col no-print">
                          {editError && <div className="edit-error">{editError}</div>}
                          <div className="edit-actions">
                            <button className="btn-icon save" onClick={saveEdit} disabled={savingEdit} title="Save">
                              <Check size={15} />
                            </button>
                            <button className="btn-icon" onClick={cancelEdit} disabled={savingEdit} title="Cancel">
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                    <tr key={record.id} className={selectedIds.has(record.id) ? 'selected' : ''}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{record.project_name || '—'}</td>
                      <td><strong>{record.work_order || '—'}</strong></td>
                      <td>{record.sno || '—'}</td>
                      <td>{record.exact_location || '—'}</td>
                      <td>
                        {record.latitude && record.longitude
                          ? `${record.latitude}, ${record.longitude}`
                          : '—'}
                      </td>
                      <td>{record.village || '—'}</td>
                      <td>{record.block || '—'}</td>
                      <td>{record.assembly_constituency || '—'}</td>
                      <td>{record.commissioning_date || '—'}</td>
                      <td>{record.module_serial || '—'}</td>
                      <td>{record.battery_serial || '—'}</td>
                      <td>{record.luminaire_serial || '—'}</td>
                      <td>
                        <span className={`status-badge ${selectedIds.has(record.id) ? 'danger' : record.rms && (record.rms.toLowerCase() === 'yes' || record.rms.toLowerCase() === 'y') ? 'success' : 'danger'}`}>
                          {record.rms || 'BLANK / NOT ENTERED'}
                        </span>
                      </td>
                      <td>
                        {record.created_at
                          ? new Date(record.created_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>{record.submitted_by || '—'}</td>
                      <td className="action-col no-print">
                        <button
                          className="btn-icon"
                          onClick={() => startEdit(record)}
                          title="Edit record"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <div className="pagination no-print">
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="page-info">
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => goToPage(pageCount)}
                disabled={page >= pageCount}
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </section>

        <footer className="rms-footer no-print">
          Sunfeed internal report tool • Downloaded report contains only RMS-not-entered records
        </footer>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, variant, loading }) {
  return (
    <div className={`stat-card ${variant || ''}`}>
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-value">
          {loading ? '—' : value.toLocaleString()}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// Filter Dropdown Component
function FilterDropdown({ label, value, options, onChange, isOpen, onToggle, isRmsFilter }) {
  return (
    <div className="filter-field">
      <label>{label}</label>
      <div className={`filter-dropdown ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="filter-toggle"
          onClick={onToggle}
        >
          <span className="filter-value">
            {isRmsFilter 
              ? (value || 'ALL')
              : (value || `All ${label}s`)}
          </span>
          <ChevronDown size={14} />
        </button>
        {isOpen && (
          <div className="filter-menu">
            {!isRmsFilter && (
              <button
                type="button"
                className={`filter-option ${!value ? 'selected' : ''}`}
                onClick={() => {
                  onChange('');
                  onToggle();
                }}
              >
                All {label}s
              </button>
            )}
            {options.length === 0 && !isRmsFilter ? (
              <div className="filter-empty">No options available</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`filter-option ${value === opt ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    onToggle();
                  }}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RMSNotEnteredReport;
