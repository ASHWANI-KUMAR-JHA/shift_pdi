import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, LogOut, Plus, Trash2, RefreshCw, Download, Upload, 
  MessageSquare, Paperclip, X, Edit2, Save, Search, FileText, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import {
  fetchJCRWorkOrders,
  createJCRWorkOrder,
  updateJCRWorkOrder,
  deleteJCRWorkOrder,
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
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

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

  const handleExportExcel = useCallback(() => {
    // Create clean workbook
    const exportData = workOrders.map(wo => ({
      'S. No.': workOrders.indexOf(wo) + 1,
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
      'Remarks': wo.pdi_pending ? 'PDI PENDING' : '',
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
    const summary = getJCRSummary(workOrders);
    const totalLights = workOrders.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0);
    
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

    XLSX.writeFile(wb, `Work_Order_Book_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage({ type: 'success', text: 'Excel exported successfully!' });
  }, [workOrders]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order to JCR Tracking', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Haryana Renewable Energy Department – SSL Material Supplied', pageWidth / 2, 22, { align: 'center' });

    // Prepare table data
    const tableData = workOrders.map((wo, index) => [
      index + 1,
      wo.work_order_no,
      formatDateForDisplay(wo.work_order_date),
      wo.client_name,
      wo.project_name,
      wo.project_location,
      wo.lights_count ? `${wo.lights_count} nos` : '',
      formatCurrency(wo.work_order_value),
      formatDateForDisplay(wo.start_date),
      formatDateForDisplay(wo.completion_date),
      wo.project_manager,
      wo.responsible_person,
      wo.status.toUpperCase(),
      wo.pdi_pending ? 'PDI PENDING' : '',
    ]);

    // Add summary row
    const summary = getJCRSummary(workOrders);
    const totalLights = workOrders.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0);
    tableData.push([
      '',
      '',
      '',
      '',
      '',
      'TOTAL',
      `${totalLights} nos`,
      formatCurrency(summary.totalValue),
      '',
      '',
      '',
      '',
      `${summary.completed} Completed`,
      '',
    ]);

    doc.autoTable({
      startY: 28,
      head: [[
        'S.No', 'WO No', 'WO Date', 'Client', 'Project', 
        'Location', 'Lights', 'Value', 'Start', 'Complete',
        'PM', 'RP', 'Status', 'Remarks'
      ]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 15 },
        2: { cellWidth: 18 },
        3: { cellWidth: 35 },
        7: { halign: 'right' },
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
    doc.text(`Total Work Orders: ${summary.total}`, 14, finalY);
    doc.text(`Completed: ${summary.completed}`, 14, finalY + 6);
    doc.text(`In Process: ${summary.in_process}`, 14, finalY + 12);
    doc.text(`Pending: ${summary.pending}`, 14, finalY + 18);

    doc.save(`Work_Order_Book_${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage({ type: 'success', text: 'PDF exported successfully!' });
  }, [workOrders]);

  const filteredWorkOrders = useMemo(() => {
    if (!searchQuery.trim()) return workOrders;
    const query = searchQuery.toLowerCase();
    return workOrders.filter(wo =>
      wo.work_order_no.toLowerCase().includes(query) ||
      wo.project_location.toLowerCase().includes(query) ||
      wo.client_name.toLowerCase().includes(query) ||
      wo.project_manager.toLowerCase().includes(query)
    );
  }, [workOrders, searchQuery]);

  const summary = useMemo(() => getJCRSummary(workOrders), [workOrders]);
  const totalLights = useMemo(() => 
    workOrders.reduce((sum, wo) => sum + (Number(wo.lights_count) || 0), 0)
  , [workOrders]);

  return (
    <div className="jcr-page">
      {/* Header Section - matching screenshot */}
      <div className="jcr-header-banner">
        <div className="jcr-header-left">
          <img src="/SUNFEED LOGO.png" alt="Sunfeed" className="jcr-logo" />
          <div className="jcr-header-text">
            <h1>Work Order to JCR Tracking</h1>
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
            <button className="btn-add" onClick={() => setShowAddForm(true)}>
              <Plus size={16} />
              Add Work Order
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
                    {searchQuery ? 'No work orders match your search' : 'No work orders yet. Click "Add Work Order" to create one.'}
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
                    await updateJCRWorkOrder(wo.id, updated);
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
                  <td><strong>₹{formatCurrency(summary.totalValue)}</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><strong>{summary.completed} Completed</strong></td>
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
          <div className="summary-card blue">
            <div className="summary-icon">📋</div>
            <div className="summary-content">
              <div className="summary-label">Total Work Orders</div>
              <div className="summary-value">{summary.total}</div>
            </div>
          </div>
          <div className="summary-card green">
            <div className="summary-icon">✓</div>
            <div className="summary-content">
              <div className="summary-label">Completed</div>
              <div className="summary-value">{summary.completed}</div>
            </div>
          </div>
          <div className="summary-card orange">
            <div className="summary-icon">⏱</div>
            <div className="summary-content">
              <div className="summary-label">In Progress</div>
              <div className="summary-value">{summary.in_process}</div>
            </div>
          </div>
          <div className="summary-card red">
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
            await createJCRWorkOrder(newWorkOrder);
            await loadWorkOrders();
            setShowAddForm(false);
            setMessage({ type: 'success', text: 'Work order created successfully!' });
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
      alert(`Upload failed: ${err.message}`);
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
          <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
            <option value="completed">COMPLETED</option>
            <option value="in_process">IN PROCESS</option>
            <option value="pending">PENDING</option>
          </select>
        </td>
        <td>
          <label>
            <input type="checkbox" checked={editData.pdi_pending} onChange={e => setEditData({...editData, pdi_pending: e.target.checked})} />
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
      <td>{workOrder.pdi_pending && <span className="pdi-badge">PDI PENDING</span>}</td>
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
              <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="pending">PENDING</option>
                <option value="in_process">IN PROCESS</option>
                <option value="completed">COMPLETED</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={formData.pdi_pending} onChange={e => setFormData({...formData, pdi_pending: e.target.checked})} />
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

export default JCRTracking;
