import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, LogOut, Plus, Trash2, RefreshCw, Download, Upload, 
  MessageSquare, Paperclip, X, Edit2, Save, Search, FileText, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import {
  fetchJCRWorkOrders,
  createJCRWorkOrder,
  updateJCRWorkOrder,
  deleteJCRWorkOrder,
  deleteAllJCRWorkOrders,
  upsertJCRWorkOrderByNumber,
  fetchComments,
  addComment,
  deleteComment,
  fetchFiles,
  uploadJCRFile,
  deleteJCRFile,
  addFileMetadata,
  deleteFileMetadata,
  getJCRFileUrl,
  getJCRSummary,
} from '../utils/jcrTracking';
import './JCRTracking.css';

function JCRTracking({ onBack, onLogout }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const excelInputRef = useRef(null);

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJCRWorkOrders();
      setWorkOrders(data);
    } catch (err) {
      setError(`Failed to load work orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this work order? This cannot be undone.')) return;
    try {
      await deleteJCRWorkOrder(id);
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      setMessage({ type: 'success', text: 'Work order deleted successfully' });
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }, []);

  const handleDeleteAll = useCallback(async () => {
    if (workOrders.length === 0) {
      setMessage({ type: 'success', text: 'There are no work orders to delete.' });
      return;
    }
    if (!window.confirm(`Delete ALL ${workOrders.length} work orders? This cannot be undone.`)) return;
    // Second confirmation for such a destructive action
    if (!window.confirm('Are you absolutely sure? Every work order will be permanently removed.')) return;
    try {
      await deleteAllJCRWorkOrders();
      setWorkOrders([]);
      setMessage({ type: 'success', text: 'All work orders deleted.' });
    } catch (err) {
      setError(`Delete all failed: ${err.message}`);
    }
  }, [workOrders.length]);

  const handleExcelImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      console.log('Excel rows:', rows); // Debug
      console.log('First row columns:', rows[0] ? Object.keys(rows[0]) : 'No rows');

      if (rows.length === 0) {
        throw new Error('No data found in Excel file');
      }

      let imported = 0;
      let updated = 0;
      let failed = 0;
      const errors = [];
      const seenNumbers = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Get all possible column names (case-insensitive)
          const getColumn = (names) => {
            for (const name of names) {
              for (const key of Object.keys(row)) {
                if (key.toLowerCase().trim() === name.toLowerCase().trim()) {
                  return row[key];
                }
              }
            }
            return null;
          };

          // Parse Excel row - handle different column name variations
          // IMPORTANT: use the actual Work Order number, NOT the serial "S. No." column
          const workOrderNo = getColumn(['Work Order No.', 'Work Order No', 'WO No.', 'WO No', 'WorkOrderNo', 'Order No']);
          const workOrderDate = parseExcelDate(getColumn(['Work Order Date', 'WO Date', 'Order Date']));
          const clientName = getColumn(['Client Name', 'Client']) || 'SUNFEED ECOSOLUTIONS INDIA PVT LTD';
          const projectName = getColumn(['Project Name', 'Project']) || 'SOLAR STREET LIGHT';
          const projectLocation = getColumn(['Project Location', 'Location', 'Site']) || '';
          
          // Parse lights count
          const lightsValue = getColumn(['Lights', 'No of Lights', 'Qty', 'Quantity']);
          const lightsStr = String(lightsValue || '').replace(/[^\d.]/g, '');
          const lightsCount = lightsStr ? parseFloat(lightsStr) : null;
          
          // Parse work order value
          const woValue = getColumn(['Work Order Value', 'WO Value', 'Value', 'Amount']);
          const workOrderValue = parseFloat(String(woValue || '0').replace(/[^\d.]/g, '')) || 0;
          
          const startDate = parseExcelDate(getColumn(['Start Date', 'Starting Date', 'Commencement Date']));
          const completionDate = parseExcelDate(getColumn(['Completion Date', 'End Date', 'Target Date']));
          const projectManager = getColumn(['Project Manager', 'PM', 'Manager']) || 'UMESH KHATTER';
          const responsiblePerson = getColumn(['Responsible Person', 'RP', 'Coordinator']) || 'UMESH KHATTER';
          
          // Parse status
          let status = 'pending';
          const statusValue = getColumn(['Status', 'Project Status', 'Work Status']);
          if (statusValue) {
            const statusStr = String(statusValue).toLowerCase();
            if (statusStr.includes('complet')) status = 'completed';
            else if (statusStr.includes('process') || statusStr.includes('progress')) status = 'in_process';
            else if (statusStr.includes('pend')) status = 'pending';
          }

          // Parse PDI pending
          const remarks = String(getColumn(['Remarks', 'Remark', 'Notes', 'Comments']) || '').toLowerCase();
          const pdiPending = remarks.includes('pdi') && remarks.includes('pend');

          // Skip if no work order number
          if (!workOrderNo || String(workOrderNo).trim() === '') {
            console.log(`Skipping row ${i + 1}: No work order number`);
            continue;
          }

          // Skip if work order number is "Total" or similar
          if (String(workOrderNo).toLowerCase().includes('total')) {
            console.log(`Skipping row ${i + 1}: Total row`);
            continue;
          }

          // Skip duplicate WO numbers within the same file (keep first occurrence)
          const woKey = String(workOrderNo).trim();
          if (seenNumbers.has(woKey)) {
            console.log(`Skipping row ${i + 1}: duplicate WO No ${woKey} in file`);
            continue;
          }
          seenNumbers.add(woKey);

          console.log(`Importing row ${i + 1}:`, {
            workOrderNo,
            workOrderDate,
            clientName,
            projectName,
            lightsCount,
            status
          });

          // Create work order
          const newWorkOrder = {
            work_order_no: String(workOrderNo).trim(),
            work_order_date: workOrderDate || new Date().toISOString().split('T')[0],
            client_name: clientName,
            project_name: projectName,
            project_location: projectLocation,
            lights_count: lightsCount,
            work_order_value: workOrderValue,
            start_date: startDate,
            completion_date: completionDate,
            project_manager: projectManager,
            responsible_person: responsiblePerson,
            status: status,
            pdi_pending: status === 'completed' ? false : pdiPending,
            created_by: getCurrentUser()?.name || 'Excel Import',
          };

          // Create or update by WO number so re-importing never creates duplicates
          const result = await upsertJCRWorkOrderByNumber(newWorkOrder);
          if (result.action === 'updated') updated++;
          else imported++;
        } catch (err) {
          failed++;
          errors.push(`Row ${i + 2}: ${err.message}`);
          console.error(`Failed to import row ${i + 1}:`, err);
        }
      }

      await loadWorkOrders();

      if (imported > 0 || updated > 0) {
        const parts = [];
        if (imported > 0) parts.push(`${imported} added`);
        if (updated > 0) parts.push(`${updated} updated (existing WO no.)`);
        if (failed > 0) parts.push(`${failed} failed`);
        setMessage({
          type: 'success',
          text: `Import complete: ${parts.join(', ')}.`
        });
      } else {
        setError(`No work orders were imported. ${failed > 0 ? `All ${failed} rows failed.` : 'Please check your Excel file format.'}`);
        if (errors.length > 0) {
          console.error('Import errors:', errors);
        }
      }

    } catch (err) {
      console.error('Import error:', err);
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  }, [loadWorkOrders]);

  // Helper function to parse Excel dates
  const parseExcelDate = (value) => {
    if (!value) return null;
    
    // If it's already a valid date string
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }

    // If it's a string like "3/18/26" or "18-01-2026"
    if (typeof value === 'string') {
      // Handle "IN PROCESS" or empty
      if (value.toUpperCase() === 'IN PROCESS' || !value.trim()) {
        return null;
      }

      // Try to parse various date formats
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        return null;
      }
    }

    // Excel serial date number (days since 1900-01-01)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }

    return null;
  };

  const filteredWorkOrders = useMemo(() => {
    let result = workOrders;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(wo => wo.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(wo =>
        wo.work_order_no.toLowerCase().includes(query) ||
        wo.project_location.toLowerCase().includes(query) ||
        wo.client_name.toLowerCase().includes(query) ||
        wo.project_manager.toLowerCase().includes(query)
      );
    }

    return result;
  }, [workOrders, searchQuery, statusFilter]);

  // Overall summary (all work orders) - used for the filter bar counts
  const summary = useMemo(() => getJCRSummary(workOrders), [workOrders]);

  // Totals for the currently filtered/visible rows
  const filteredSummary = useMemo(() => getJCRSummary(filteredWorkOrders), [filteredWorkOrders]);
  const totalLights = useMemo(() =>
    filteredWorkOrders.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0)
  , [filteredWorkOrders]);

  const handleExportExcel = useCallback(() => {
    const dataToExport = filteredWorkOrders;
    if (dataToExport.length === 0) {
      setError('Nothing to export for the current filter.');
      return;
    }
    const filterLabel = statusFilter === 'all' ? '' : `_${statusFilter}`;

    // Create clean workbook
    const exportData = dataToExport.map((wo, idx) => ({
      'S. No.': idx + 1,
      'Work Order No.': wo.work_order_no,
      'Work Order Date': formatDateForExcel(wo.work_order_date),
      'Client Name': wo.client_name,
      'Project Name': wo.project_name,
      'Project Location': wo.project_location,
      'Lights': wo.lights_count ? `${wo.lights_count} nos` : '',
      'Work Order Value': Number(wo.work_order_value),
      'Start Date': formatDateForExcel(wo.start_date),
      'Completion Date': formatDateForExcel(wo.completion_date),
      'Project Manager': wo.project_manager,
      'Responsible Person': wo.responsible_person,
      'Status': wo.status.toUpperCase(),
      'Remarks': (wo.pdi_pending && wo.status !== 'completed') ? 'PDI PENDING' : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // S. No.
      { wch: 12 }, // Work Order No.
      { wch: 15 }, // Work Order Date
      { wch: 35 }, // Client Name
      { wch: 20 }, // Project Name
      { wch: 40 }, // Project Location
      { wch: 10 }, // Lights
      { wch: 15 }, // Work Order Value
      { wch: 12 }, // Start Date
      { wch: 15 }, // Completion Date
      { wch: 18 }, // Project Manager
      { wch: 20 }, // Responsible Person
      { wch: 12 }, // Status
      { wch: 15 }, // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Order Book');
    
    // Add totals row
    const summary = getJCRSummary(dataToExport);
    const totalLights = dataToExport.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0);
    
    XLSX.utils.sheet_add_json(ws, [{
      'S. No.': '',
      'Work Order No.': '',
      'Work Order Date': '',
      'Client Name': '',
      'Project Name': '',
      'Project Location': 'TOTAL',
      'Lights': `${totalLights} nos`,
      'Work Order Value': summary.totalValue,
      'Start Date': '',
      'Completion Date': '',
      'Project Manager': '',
      'Responsible Person': '',
      'Status': `${summary.completed} Completed`,
      'Remarks': '',
    }], { origin: -1, skipHeader: true });

    XLSX.writeFile(wb, `Work_Order_Book${filterLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage({ type: 'success', text: `Exported ${dataToExport.length} work order${dataToExport.length !== 1 ? 's' : ''} to Excel!` });
  }, [filteredWorkOrders, statusFilter]);

  const handleExportPDF = useCallback(async () => {
    const dataToExport = filteredWorkOrders;
    if (dataToExport.length === 0) {
      setError('Nothing to export for the current filter.');
      return;
    }
    const statusTextMap = { all: 'All', completed: 'Completed', in_process: 'In Progress', pending: 'Pending' };
    const filterText = statusTextMap[statusFilter] || 'All';
    const filterLabel = statusFilter === 'all' ? '' : `_${statusFilter}`;

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add Sunfeed logo at top-left
    let tableStartY = 28;
    const logo = await loadImageAsDataURL('/SUNFEED LOGO.png');
    if (logo) {
      const logoH = 16; // mm
      const logoW = logo.height ? (logo.width / logo.height) * logoH : 30;
      doc.addImage(logo.dataUrl, 'PNG', 10, 8, logoW, logoH);
      tableStartY = Math.max(tableStartY, 8 + logoH + 4);
    }

    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order Tracking', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Haryana Renewable Energy Department - SSL Material Supplied  (Filter: ${filterText})`, pageWidth / 2, 22, { align: 'center' });

    // Prepare table data
    const tableData = dataToExport.map((wo, index) => [
      index + 1,
      wo.work_order_no,
      formatDateForDisplay(wo.work_order_date),
      wo.client_name,
      wo.project_name,
      wo.project_location,
      wo.lights_count ? `${wo.lights_count} nos` : '',
      `Rs. ${formatCurrency(wo.work_order_value)}`,
      formatDateForDisplay(wo.start_date),
      formatDateForDisplay(wo.completion_date),
      wo.project_manager,
      wo.responsible_person,
      wo.status.toUpperCase().replace('_', ' '),
      (wo.pdi_pending && wo.status !== 'completed') ? 'PDI PENDING' : '',
    ]);

    // Add summary row
    const summary = getJCRSummary(dataToExport);
    const totalLights = dataToExport.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0);
    tableData.push([
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      `${totalLights} nos`,
      `Rs. ${formatCurrency(summary.totalValue)}`,
      '',
      '',
      '',
      '',
      `${summary.completed} Completed`,
      '',
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [[
        'S.No', 'WO No', 'WO Date', 'Client', 'Project', 
        'Location', 'Lights', 'Value', 'Start', 'Complete',
        'PM', 'RP', 'Status', 'Remarks'
      ]],
      body: tableData,
      styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold', halign: 'center' },
      tableWidth: 'auto',
      margin: { left: 6, right: 6 },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },   // S.No
        1: { cellWidth: 14 },                     // WO No
        2: { cellWidth: 17 },                     // WO Date
        3: { cellWidth: 34 },                     // Client
        4: { cellWidth: 22 },                     // Project
        5: { cellWidth: 40 },                     // Location
        6: { cellWidth: 14, halign: 'center' },   // Lights
        7: { cellWidth: 22, halign: 'right' },    // Value
        8: { cellWidth: 18 },                     // Start
        9: { cellWidth: 18 },                     // Complete
        10: { cellWidth: 24 },                    // PM
        11: { cellWidth: 24 },                    // RP
        12: { cellWidth: 18, halign: 'center' },  // Status
        13: { cellWidth: 18 },                    // Remarks
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Add summary footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Showing: ${filterText}  |  Work Orders: ${summary.total}`, 14, finalY);
    doc.text(`Completed: ${summary.completed}    In Progress: ${summary.in_process}    Pending: ${summary.pending}`, 14, finalY + 6);
    doc.text(`Total WO Value: Rs. ${formatCurrency(summary.totalValue)}`, 14, finalY + 12);

    doc.save(`Work_Order_Book${filterLabel}_${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage({ type: 'success', text: `Exported ${dataToExport.length} work order${dataToExport.length !== 1 ? 's' : ''} to PDF!` });
  }, [filteredWorkOrders, statusFilter]);

  const handleExit = useCallback(() => {
    if (window.confirm('Do you want to leave this page and return to the Dashboard?')) {
      onBack?.();
    }
  }, [onBack]);

  return (
    <div className="jcr-page">
      {/* Header Section - matching screenshot */}
      <div className="jcr-header-banner">
        <div className="jcr-header-left">
          <img src="/SUNFEED LOGO.png" alt="Sunfeed" className="jcr-logo" />
          <div className="jcr-header-text">
            <h1>Work Order Tracking</h1>
            <p>Haryana Renewable Energy Department – SSL Material Supplied (March 2026)</p>
          </div>
        </div>
        <div className="jcr-header-right">
          <button className="jcr-header-btn" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <button className="jcr-header-btn" onClick={handleExportPDF}>
            <FileText size={16} />
            Export PDF
          </button>
          <button className="jcr-header-btn" onClick={handleExit}>
            <ArrowLeft size={16} />
            Exit
          </button>
          <button className="jcr-header-btn logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="jcr-body">
        {/* Controls - compact toolbar */}
        <div className="jcr-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="btn-import" onClick={() => excelInputRef.current?.click()} disabled={importing}>
              <Upload size={16} />
              {importing ? 'Importing...' : 'Import Excel'}
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              style={{ display: 'none' }}
            />
            <button className="btn-add" onClick={() => setShowAddForm(true)}>
              <Plus size={16} />
              Add Work Order
            </button>
            <button className="btn-delete-all" onClick={handleDeleteAll} disabled={loading || workOrders.length === 0}>
              <Trash2 size={16} />
              Delete All
            </button>
            <button className="btn-refresh" onClick={loadWorkOrders} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {message && (
          <div className={`jcr-message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage(null)}><X size={16} /></button>
          </div>
        )}
        {error && (
          <div className="jcr-message error">
            {error}
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {/* Status Filter Bar */}
        <div className="jcr-filter-bar">
          <button
            className={`filter-chip all ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="chip-count">{summary.total}</span>
          </button>
          <button
            className={`filter-chip completed ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed <span className="chip-count">{summary.completed}</span>
          </button>
          <button
            className={`filter-chip in_process ${statusFilter === 'in_process' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_process')}
          >
            In Progress <span className="chip-count">{summary.in_process}</span>
          </button>
          <button
            className={`filter-chip pending ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending <span className="chip-count">{summary.pending}</span>
          </button>
          <div className="filter-total">
            WO Value Total: <strong>₹{formatCurrency(filteredSummary.totalValue)}</strong>
          </div>
        </div>

        {/* Work Orders Table - matching screenshot exactly */}
        <div className="jcr-table-container">
          <table className="jcr-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Work Order No</th>
                <th>WO Date</th>
                <th>Client Name</th>
                <th>Project Name</th>
                <th>Project Location</th>
                <th>Lights</th>
                <th>WO Value</th>
                <th>Start Date</th>
                <th>Completion Date</th>
                <th>Project Manager</th>
                <th>Responsible Person</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Files</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="17" className="loading">Loading work orders...</td>
                </tr>
              )}
              {!loading && filteredWorkOrders.length === 0 && (
                <tr>
                  <td colSpan="17" className="empty">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No work orders match the current filter'
                      : 'No work orders yet. Click "Add Work Order" to create one.'}
                  </td>
                </tr>
              )}
              {filteredWorkOrders.map((wo, index) => (
                <WorkOrderRow
                  key={wo.id}
                  workOrder={wo}
                  index={index + 1}
                  isEditing={editingId === wo.id}
                  onEdit={() => setEditingId(wo.id)}
                  onSave={async (updated) => {
                    // Completed work orders cannot have PDI pending
                    const payload = updated.status === 'completed'
                      ? { ...updated, pdi_pending: false }
                      : updated;
                    await updateJCRWorkOrder(wo.id, payload);
                    await loadWorkOrders();
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(wo.id)}
                  onShowComments={() => {
                    setSelectedWorkOrder(wo);
                    setShowCommentsModal(true);
                  }}
                />
              ))}
              {/* Total Row */}
              {filteredWorkOrders.length > 0 && (
                <tr className="total-row">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{totalLights} nos</strong></td>
                  <td><strong>₹{formatCurrency(filteredSummary.totalValue)}</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><strong>{filteredSummary.completed} Completed</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Cards - matching screenshot */}
        <div className="jcr-bottom-summary">
          <div
            className={`summary-card blue clickable ${statusFilter === 'all' ? 'selected' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="summary-icon">📋</div>
            <div className="summary-content">
              <div className="summary-label">Total Work Orders</div>
              <div className="summary-value">{summary.total}</div>
            </div>
          </div>
          <div
            className={`summary-card green clickable ${statusFilter === 'completed' ? 'selected' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          >
            <div className="summary-icon">✓</div>
            <div className="summary-content">
              <div className="summary-label">Completed</div>
              <div className="summary-value">{summary.completed}</div>
            </div>
          </div>
          <div
            className={`summary-card orange clickable ${statusFilter === 'in_process' ? 'selected' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'in_process' ? 'all' : 'in_process')}
          >
            <div className="summary-icon">⏱</div>
            <div className="summary-content">
              <div className="summary-label">In Progress</div>
              <div className="summary-value">{summary.in_process}</div>
            </div>
          </div>
          <div
            className={`summary-card red clickable ${statusFilter === 'pending' ? 'selected' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <div className="summary-icon">⏸</div>
            <div className="summary-content">
              <div className="summary-label">Pending</div>
              <div className="summary-value">{summary.pending}</div>
            </div>
          </div>
          <div className="summary-card purple">
            <div className="summary-icon">📍</div>
            <div className="summary-content">
              <div className="summary-label">Department</div>
              <div className="summary-value-text">Haryana Renewable Energy Department</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Work Order Modal */}
      {showAddForm && (
        <AddWorkOrderModal
          onClose={() => setShowAddForm(false)}
          onSave={async (newWorkOrder) => {
            try {
              // Sanitize: empty strings must become null (dates) or proper numbers
              const payload = {
                ...newWorkOrder,
                lights_count:
                  newWorkOrder.lights_count === '' || newWorkOrder.lights_count == null
                    ? null
                    : Number(newWorkOrder.lights_count),
                work_order_value:
                  newWorkOrder.work_order_value === '' || newWorkOrder.work_order_value == null
                    ? 0
                    : Number(newWorkOrder.work_order_value),
                start_date: newWorkOrder.start_date || null,
                completion_date: newWorkOrder.completion_date || null,
                // Completed work orders cannot have PDI pending
                pdi_pending: newWorkOrder.status === 'completed' ? false : newWorkOrder.pdi_pending,
              };
              const result = await upsertJCRWorkOrderByNumber(payload);
              await loadWorkOrders();
              setShowAddForm(false);
              setMessage({
                type: 'success',
                text: result.action === 'updated'
                  ? `Work order ${payload.work_order_no} already existed - it was updated.`
                  : 'Work order created successfully!',
              });
            } catch (err) {
              setError(`Failed to create work order: ${err.message}`);
            }
          }}
        />
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedWorkOrder && (
        <CommentsModal
          workOrder={selectedWorkOrder}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedWorkOrder(null);
          }}
        />
      )}
    </div>
  );
}

// Work Order Row Component with inline editing
function WorkOrderRow({ workOrder, index, isEditing, onEdit, onSave, onCancel, onDelete, onShowComments }) {
  const [editData, setEditData] = useState(workOrder);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, [workOrder.id]);

  const loadFiles = async () => {
    try {
      const data = await fetchFiles(workOrder.id);
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { filePath, fileName } = await uploadJCRFile(workOrder.id, file);
      await addFileMetadata(
        workOrder.id,
        fileName,
        filePath,
        file.size,
        file.type,
        getCurrentUser()?.name || 'Unknown'
      );
      await loadFiles();
    } catch (err) {
      const msg = String(err?.message || err);
      const isPolicy = /row-level security|policy|not found|bucket/i.test(msg);
      alert(
        isPolicy
          ? `Upload failed: ${msg}\n\nThe storage bucket "work_order_files" is missing or has no access policy. Run supabase_jcr_file_uploads_fix.sql in the Supabase SQL editor to fix this.`
          : `Upload failed: ${msg}`
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId, filePath) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await deleteJCRFile(filePath);
      await deleteFileMetadata(fileId);
      await loadFiles();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (isEditing) {
    return (
      <tr className="editing-row">
        <td>{index}</td>
        <td><input value={editData.work_order_no} onChange={e => setEditData({...editData, work_order_no: e.target.value})} /></td>
        <td><input type="date" value={editData.work_order_date} onChange={e => setEditData({...editData, work_order_date: e.target.value})} /></td>
        <td><input value={editData.client_name} onChange={e => setEditData({...editData, client_name: e.target.value})} /></td>
        <td><input value={editData.project_name} onChange={e => setEditData({...editData, project_name: e.target.value})} /></td>
        <td><input value={editData.project_location} onChange={e => setEditData({...editData, project_location: e.target.value})} /></td>
        <td><input type="number" value={editData.lights_count || ''} onChange={e => setEditData({...editData, lights_count: e.target.value})} /></td>
        <td><input type="number" value={editData.work_order_value} onChange={e => setEditData({...editData, work_order_value: e.target.value})} /></td>
        <td><input type="date" value={editData.start_date || ''} onChange={e => setEditData({...editData, start_date: e.target.value})} /></td>
        <td><input type="date" value={editData.completion_date || ''} onChange={e => setEditData({...editData, completion_date: e.target.value})} /></td>
        <td><input value={editData.project_manager} onChange={e => setEditData({...editData, project_manager: e.target.value})} /></td>
        <td><input value={editData.responsible_person} onChange={e => setEditData({...editData, responsible_person: e.target.value})} /></td>
        <td>
          <select value={editData.status} onChange={e => {
            const newStatus = e.target.value;
            setEditData({
              ...editData,
              status: newStatus,
              // When a work order is Completed, PDI is no longer pending
              pdi_pending: newStatus === 'completed' ? false : editData.pdi_pending,
            });
          }}>
            <option value="completed">COMPLETED</option>
            <option value="in_process">IN PROCESS</option>
            <option value="pending">PENDING</option>
          </select>
        </td>
        <td>
          <label>
            <input
              type="checkbox"
              checked={editData.status === 'completed' ? false : editData.pdi_pending}
              disabled={editData.status === 'completed'}
              onChange={e => setEditData({...editData, pdi_pending: e.target.checked})}
            />
            PDI Pending
          </label>
        </td>
        <td colSpan="3">
          <div className="edit-actions">
            <button className="btn-save" onClick={() => onSave(editData)}>
              <Save size={16} /> Save
            </button>
            <button className="btn-cancel" onClick={onCancel}>
              <X size={16} /> Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`status-${workOrder.status}`}>
      <td>{index}</td>
      <td><strong>{workOrder.work_order_no}</strong></td>
      <td>{formatDateForDisplay(workOrder.work_order_date)}</td>
      <td>{workOrder.client_name}</td>
      <td>{workOrder.project_name}</td>
      <td>{workOrder.project_location}</td>
      <td>{workOrder.lights_count ? `${workOrder.lights_count} nos` : ''}</td>
      <td>₹{formatCurrency(workOrder.work_order_value)}</td>
      <td>{formatDateForDisplay(workOrder.start_date)}</td>
      <td>{formatDateForDisplay(workOrder.completion_date)}</td>
      <td>{workOrder.project_manager}</td>
      <td>{workOrder.responsible_person}</td>
      <td>
        <span className={`status-badge ${workOrder.status}`}>
          {workOrder.status.toUpperCase().replace('_', ' ')}
        </span>
      </td>
      <td>{workOrder.pdi_pending && workOrder.status !== 'completed' && <span className="pdi-badge">PDI PENDING</span>}</td>
      <td>
        <div className="file-cell">
          <button 
            className="btn-icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload file"
          >
            <Paperclip size={16} />
            {files.length > 0 && <span className="file-count">{files.length}</span>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          {files.length > 0 && (
            <div className="files-dropdown">
              {files.map(file => (
                <div key={file.id} className="file-item">
                  <a href={getJCRFileUrl(file.file_path)} target="_blank" rel="noopener noreferrer">
                    {file.file_name}
                  </a>
                  <button onClick={() => handleDeleteFile(file.id, file.file_path)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <button className="btn-icon" onClick={onShowComments} title="View comments">
          <MessageSquare size={16} />
        </button>
      </td>
      <td>
        <div className="action-buttons">
          <button className="btn-icon" onClick={onEdit} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon danger" onClick={onDelete} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Add Work Order Modal Component
function AddWorkOrderModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    work_order_no: '',
    work_order_date: new Date().toISOString().split('T')[0],
    client_name: 'SUNFEED ECOSOLUTIONS INDIA PVT LTD',
    project_name: 'SOLAR STREET LIGHT',
    project_location: '',
    lights_count: '',
    work_order_value: '',
    start_date: '',
    completion_date: '',
    project_manager: 'UMESH KHATTER',
    responsible_person: 'UMESH KHATTER',
    status: 'pending',
    pdi_pending: false,
    created_by: getCurrentUser()?.name || 'Unknown',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Work Order</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Work Order No *</label>
              <input required value={formData.work_order_no} onChange={e => setFormData({...formData, work_order_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Work Order Date *</label>
              <input type="date" required value={formData.work_order_date} onChange={e => setFormData({...formData, work_order_date: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Client Name *</label>
            <input required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Project Name *</label>
            <input required value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Project Location *</label>
            <input required value={formData.project_location} onChange={e => setFormData({...formData, project_location: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Lights (nos)</label>
              <input type="number" value={formData.lights_count} onChange={e => setFormData({...formData, lights_count: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Work Order Value *</label>
              <input type="number" required value={formData.work_order_value} onChange={e => setFormData({...formData, work_order_value: e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Completion Date</label>
              <input type="date" value={formData.completion_date} onChange={e => setFormData({...formData, completion_date: e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Project Manager *</label>
              <input required value={formData.project_manager} onChange={e => setFormData({...formData, project_manager: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Responsible Person *</label>
              <input required value={formData.responsible_person} onChange={e => setFormData({...formData, responsible_person: e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status *</label>
              <select required value={formData.status} onChange={e => {
                const newStatus = e.target.value;
                setFormData({
                  ...formData,
                  status: newStatus,
                  pdi_pending: newStatus === 'completed' ? false : formData.pdi_pending,
                });
              }}>
                <option value="pending">PENDING</option>
                <option value="in_process">IN PROCESS</option>
                <option value="completed">COMPLETED</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.status === 'completed' ? false : formData.pdi_pending}
                  disabled={formData.status === 'completed'}
                  onChange={e => setFormData({...formData, pdi_pending: e.target.checked})}
                />
                PDI Pending
              </label>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">Create Work Order</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Comments Modal Component
function CommentsModal({ workOrder, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [workOrder.id]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await fetchComments(workOrder.id);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment(workOrder.id, newComment, getCurrentUser()?.name || 'Unknown');
      setNewComment('');
      await loadComments();
    } catch (err) {
      alert(`Failed to add comment: ${err.message}`);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err) {
      alert(`Failed to delete comment: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content comments-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Comments - WO #{workOrder.work_order_no}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="comments-list">
          {loading && <p>Loading comments...</p>}
          {!loading && comments.length === 0 && (
            <p className="no-comments">No comments yet. Be the first to comment!</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <strong>{comment.created_by}</strong>
                <span>{formatDateTime(comment.created_at)}</span>
              </div>
              <div className="comment-text">{comment.comment_text}</div>
              <button 
                className="btn-delete-comment" 
                onClick={() => handleDeleteComment(comment.id)}
                title="Delete comment"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddComment} className="comment-form">
          <textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            rows={3}
          />
          <button type="submit" disabled={!newComment.trim()}>
            Post Comment
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper functions
function formatDateForDisplay(dateString) {
  if (!dateString || dateString === 'IN PROCESS') return 'IN PROCESS';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateForExcel(dateString) {
  if (!dateString || dateString === 'IN PROCESS') return 'IN PROCESS';
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(value) {
  if (!value) return '0';
  return Number(value).toLocaleString('en-IN');
}

// Load an image from the public folder and return it as a PNG data URL (for jsPDF)
function loadImageAsDataURL(src) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

export default JCRTracking;
