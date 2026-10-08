import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, LogOut, Save, Trash2, FileText, Download, RefreshCw, Plus, Bold, Italic, Underline, Palette, FileJson, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  extractVariables,
  applyVariables,
  humanizeVariable,
} from '../utils/letterTemplates';
import { wrapSelection, MARKERS, colorMarkers, parseRichText } from '../utils/richText';
import './LetterGenerator.css';

const BLANK = { id: null, name: '', subject: '', body: '' };

// Preset colours offered in the formatting toolbar.
const COLOR_PRESETS = ['#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#ca8a04', '#16a34a', '#000000'];

// Render markup (**bold**, //italic//, __underline__, {color:#..|txt}) as
// styled spans for the live preview.
function RichText({ text }) {
  const segments = parseRichText(text);
  return segments.map((s, idx) => (
    <span
      key={idx}
      style={{
        fontWeight: s.bold ? 700 : undefined,
        fontStyle: s.italic ? 'italic' : undefined,
        textDecoration: s.underline ? 'underline' : undefined,
        color: s.color || undefined,
      }}
    >
      {s.text}
    </span>
  ));
}

function LetterGenerator({ onBack, onLogout }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(BLANK);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const previewRef = useRef(null);

  // Optional letter meta shown above the subject. Each block can be toggled
  // off per letter without clearing what you typed.
  const [meta, setMeta] = useState({
    showDate: true,
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    showTo: true,
    to: '',
    showAddress: true,
    address: '',
  });

  // Rich text formatting state
  const [showColors, setShowColors] = useState(false);
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  // Watermark state
  const [watermark, setWatermark] = useState({
    enabled: false,
    imageUrl: null,
    imageName: '',
    position: { x: 50, y: 50 }, // percentage from top-left
    size: 30, // percentage of page width
    opacity: 0.15, // 0-1
    fixed: false, // whether position is locked
    aspectRatio: 1, // width / height ratio
  });
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const watermarkInputRef = useRef(null);

  const handleMetaChange = useCallback((field, value) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Format a yyyy-mm-dd string as "01 January 2026". Falls back to today.
  const formatDate = useCallback((iso) => {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchTemplates();
      setTemplates(rows);
    } catch (err) {
      setStatus(`Failed to load templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Variables detected across the letter (subject + body + optional To/Address).
  const variables = useMemo(
    () => extractVariables(
      draft.subject,
      draft.body,
      meta.showTo ? meta.to : '',
      meta.showAddress ? meta.address : ''
    ),
    [draft.subject, draft.body, meta.showTo, meta.to, meta.showAddress, meta.address]
  );

  // Rendered letter with values substituted in.
  const renderedSubject = useMemo(
    () => applyVariables(draft.subject, values),
    [draft.subject, values]
  );
  const renderedBody = useMemo(
    () => applyVariables(draft.body, values),
    [draft.body, values]
  );

  const handleSelectTemplate = useCallback((id) => {
    setSelectedId(id);
    setValues({});
    setStatus('');
    if (!id) {
      setDraft(BLANK);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setDraft({ id: tpl.id, name: tpl.name, subject: tpl.subject || '', body: tpl.body || '' });
    }
  }, [templates]);

  const handleNew = useCallback(() => {
    setSelectedId('');
    setDraft(BLANK);
    setValues({});
    setStatus('');
  }, []);

  // Apply a formatting marker to the currently selected text in the body.
  // Falls back to inserting empty markers at the caret if nothing is selected.
  const applyFormat = useCallback((marker) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const { text, selectionStart, selectionEnd } = wrapSelection(
      el.value, start, end, marker.prefix, marker.suffix
    );
    setDraft((d) => ({ ...d, body: text }));
    // Restore selection after React re-renders the textarea.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  }, []);

  const applyColor = useCallback((hex) => {
    applyFormat(colorMarkers(hex));
    setShowColors(false);
  }, [applyFormat]);

  // Watermark upload handler
  const handleWatermarkUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setStatus('Please select an image file (PNG, JPG, etc.)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      // Load image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setWatermark(prev => ({
          ...prev,
          enabled: true,
          imageUrl: reader.result,
          imageName: file.name,
          position: { x: 50, y: 50 },
          size: 30,
          opacity: 0.15,
          fixed: false,
          aspectRatio: aspectRatio,
        }));
        setStatus(`Watermark "${file.name}" loaded. Drag to position it.`);
      };
      img.onerror = () => {
        setStatus('Failed to load watermark image.');
      };
      img.src = reader.result;
    };
    reader.onerror = () => setStatus('Failed to load watermark image.');
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleRemoveWatermark = useCallback(() => {
    setWatermark({
      enabled: false,
      imageUrl: null,
      imageName: '',
      position: { x: 50, y: 50 },
      size: 30,
      opacity: 0.15,
      fixed: false,
      aspectRatio: 1,
    });
    setStatus('Watermark removed.');
  }, []);

  const handleWatermarkMouseDown = useCallback((e) => {
    if (watermark.fixed) return;
    e.preventDefault();
    setIsDraggingWatermark(true);
    
    const preview = previewRef.current;
    if (!preview) return;
    
    const rect = preview.getBoundingClientRect();
    const watermarkEl = e.currentTarget;
    const watermarkRect = watermarkEl.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - watermarkRect.left,
      y: e.clientY - watermarkRect.top,
    });
  }, [watermark.fixed]);

  const handleWatermarkMouseMove = useCallback((e) => {
    if (!isDraggingWatermark || watermark.fixed) return;
    
    const preview = previewRef.current;
    if (!preview) return;
    
    const rect = preview.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    
    setWatermark(prev => ({
      ...prev,
      position: {
        x: Math.max(0, Math.min(100 - prev.size * 0.5, x)),
        y: Math.max(0, Math.min(100 - prev.size * 0.5, y)),
      },
    }));
  }, [isDraggingWatermark, watermark.fixed, dragOffset]);

  const handleWatermarkMouseUp = useCallback(() => {
    setIsDraggingWatermark(false);
  }, []);

  useEffect(() => {
    if (isDraggingWatermark) {
      document.addEventListener('mousemove', handleWatermarkMouseMove);
      document.addEventListener('mouseup', handleWatermarkMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleWatermarkMouseMove);
        document.removeEventListener('mouseup', handleWatermarkMouseUp);
      };
    }
  }, [isDraggingWatermark, handleWatermarkMouseMove, handleWatermarkMouseUp]);

  // Export the full letter — template content, optional meta blocks, and the
  // filled-in variable values — as a portable JSON file. Loading it back
  // restores everything exactly, including formatting markup.
  const exportToJSON = useCallback(() => {
    const payload = {
      type: 'sunfeed-letter',
      version: 1,
      exportedAt: new Date().toISOString(),
      template: {
        name: draft.name,
        subject: draft.subject,
        body: draft.body,
      },
      meta,
      values,
      watermark: watermark.enabled ? {
        imageName: watermark.imageName,
        imageUrl: watermark.imageUrl,
        position: watermark.position,
        size: watermark.size,
        opacity: watermark.opacity,
        fixed: watermark.fixed,
        aspectRatio: watermark.aspectRatio,
      } : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = (draft.name || 'letter').replace(/[^\w-]+/g, '_').toLowerCase();
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Letter exported as JSON.');
  }, [draft, meta, values]);

  // Restore a letter from a previously exported JSON file.
  const handleLoadJSON = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.type !== 'sunfeed-letter' || !data.template) {
          throw new Error('Not a valid Sunfeed letter file.');
        }
        setSelectedId('');
        setDraft({
          id: null,
          name: data.template.name || '',
          subject: data.template.subject || '',
          body: data.template.body || '',
        });
        if (data.meta && typeof data.meta === 'object') {
          setMeta((prev) => ({ ...prev, ...data.meta }));
        }
        setValues(data.values && typeof data.values === 'object' ? data.values : {});
        
        // Restore watermark if present
        if (data.watermark && typeof data.watermark === 'object' && data.watermark.imageUrl) {
          // Load image to get aspect ratio if not stored
          const img = new window.Image();
          img.onload = () => {
            const aspectRatio = data.watermark.aspectRatio || (img.width / img.height) || 1;
            setWatermark({
              enabled: true,
              imageUrl: data.watermark.imageUrl,
              imageName: data.watermark.imageName || 'watermark',
              position: data.watermark.position || { x: 50, y: 50 },
              size: data.watermark.size || 30,
              opacity: data.watermark.opacity || 0.15,
              fixed: data.watermark.fixed || false,
              aspectRatio: aspectRatio,
            });
          };
          img.onerror = () => {
            // Fallback if image fails to load
            setWatermark({
              enabled: true,
              imageUrl: data.watermark.imageUrl,
              imageName: data.watermark.imageName || 'watermark',
              position: data.watermark.position || { x: 50, y: 50 },
              size: data.watermark.size || 30,
              opacity: data.watermark.opacity || 0.15,
              fixed: data.watermark.fixed || false,
              aspectRatio: data.watermark.aspectRatio || 1,
            });
          };
          img.src = data.watermark.imageUrl;
        } else {
          setWatermark({
            enabled: false,
            imageUrl: null,
            imageName: '',
            position: { x: 50, y: 50 },
            size: 30,
            opacity: 0.15,
            fixed: false,
            aspectRatio: 1,
          });
        }
        
        setStatus(`Loaded letter from "${file.name}".`);
      } catch (err) {
        setStatus(`Load failed: ${err.message}`);
      }
    };
    reader.onerror = () => setStatus('Load failed: could not read file.');
    reader.readAsText(file);
    // Reset so the same file can be chosen again later.
    e.target.value = '';
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) {
      setStatus('Please enter a template name before saving.');
      return;
    }
    try {
      setLoading(true);
      const createdBy = getCurrentUser()?.name || '';
      if (draft.id) {
        const updated = await updateTemplate(draft.id, {
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
        });
        setStatus('Template updated.');
        setDraft({ id: updated.id, name: updated.name, subject: updated.subject || '', body: updated.body || '' });
      } else {
        const created = await createTemplate({
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
          createdBy,
        });
        setStatus('Template saved.');
        setSelectedId(created.id);
        setDraft({ id: created.id, name: created.name, subject: created.subject || '', body: created.body || '' });
      }
      await loadTemplates();
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [draft, loadTemplates]);

  const handleDelete = useCallback(async () => {
    if (!draft.id) return;
    if (!window.confirm(`Delete template "${draft.name}"?`)) return;
    try {
      setLoading(true);
      await deleteTemplate(draft.id);
      setStatus('Template deleted.');
      handleNew();
      await loadTemplates();
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [draft, handleNew, loadTemplates]);

  const handleValueChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const exportToPDF = useCallback(async () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Load logo (same asset used across the app's PDFs).
    let logoImg = null;
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = '/SUNFEED LOGO.png';
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      logoImg = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    // Load watermark image if enabled
    let watermarkImg = null;
    if (watermark.enabled && watermark.imageUrl) {
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = watermark.imageUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        watermarkImg = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Could not load watermark for PDF:', e);
      }
    }

    const drawHeaderFooter = () => {
      let hy = margin;
      if (logoImg) doc.addImage(logoImg, 'PNG', margin, hy, 45, 15);

      const corpX = pageWidth - margin - 55;
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('Corporate Office:', corpX, hy + 4);
      doc.setFont('helvetica', 'bold');
      doc.text('Sunfeed Ecosolutions India (P) Ltd.', corpX, hy + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('527, 5th Floor, DLF Star Tower, NH-8', corpX, hy + 12);
      doc.text('Sector-30, Gurugram - 122001 (Haryana)', corpX, hy + 16);
      doc.text('GSTIN: 06AAWCS8301B1ZC', corpX, hy + 20);

      // Footer
      const footerY = pageHeight - 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      const footerTextY = footerY + 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const p1 = 'web: ';
      const p2 = 'www.sunfeedindia.com';
      const p3 = ' | Contact us at:+91-124-4072847 or email us at: ';
      const p4 = 'info.sunfeed@gmail.com';
      const p5 = ' | CIN: U40300HR2016PTC058410';
      const totalWidth = doc.getTextWidth(p1) + doc.getTextWidth(p2) + doc.getTextWidth(p3) + doc.getTextWidth(p4) + doc.getTextWidth(p5);
      let cx = (pageWidth - totalWidth) / 2;
      doc.setTextColor(0, 0, 0);
      doc.text(p1, cx, footerTextY); cx += doc.getTextWidth(p1);
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(p2, cx, footerTextY, { url: 'http://www.sunfeedindia.com' }); cx += doc.getTextWidth(p2);
      doc.setTextColor(0, 0, 0);
      doc.text(p3, cx, footerTextY); cx += doc.getTextWidth(p3);
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(p4, cx, footerTextY, { url: 'mailto:info.sunfeed@gmail.com' }); cx += doc.getTextWidth(p4);
      doc.setTextColor(0, 0, 0);
      doc.text(p5, cx, footerTextY);
    };

    const drawWatermark = () => {
      if (!watermarkImg) return;
      
      // Define the content area (same as where letter content is rendered)
      const contentAreaTop = margin + 30; // topStart
      const contentAreaBottom = pageHeight - 24; // bottomLimit
      const contentAreaHeight = contentAreaBottom - contentAreaTop;
      const contentAreaWidth = pageWidth - (margin * 2);
      
      // Calculate watermark size based on content area width (not full page)
      const watermarkWidth = (contentAreaWidth * watermark.size) / 100;
      // Use stored aspect ratio
      const watermarkHeight = watermarkWidth / watermark.aspectRatio;
      
      // Calculate position relative to content area
      const watermarkX = margin + (contentAreaWidth * watermark.position.x) / 100;
      const watermarkY = contentAreaTop + (contentAreaHeight * watermark.position.y) / 100;
      
      // Set opacity using GState
      doc.setGState(new doc.GState({ opacity: watermark.opacity }));
      doc.addImage(watermarkImg, 'PNG', watermarkX, watermarkY, watermarkWidth, watermarkHeight);
      // Reset opacity for other content
      doc.setGState(new doc.GState({ opacity: 1.0 }));
    };

    const topStart = margin + 30;
    const bottomLimit = pageHeight - 24;
    let y = topStart;
    
    drawHeaderFooter();
    drawWatermark(); // Draw watermark behind all content

    // Date (right aligned) — optional
    if (meta.showDate) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${formatDate(meta.date)}`, pageWidth - margin, y, { align: 'right' });
      y += 10;
    }

    // To block — optional (supports {{variables}})
    if (meta.showTo && applyVariables(meta.to, values).trim()) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('To,', margin, y);
      y += 6;
      const toLines = applyVariables(meta.to, values).split(/\n/);
      for (const raw of toLines) {
        const lines = doc.splitTextToSize(raw, contentWidth);
        for (const line of lines) {
          doc.text(line, margin, y);
          y += 6;
        }
      }
      y += 2;
    }

    // Address block — optional (supports {{variables}})
    if (meta.showAddress && applyVariables(meta.address, values).trim()) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const addrLines = applyVariables(meta.address, values).split(/\n/);
      for (const raw of addrLines) {
        const lines = doc.splitTextToSize(raw, contentWidth);
        for (const line of lines) {
          doc.text(line, margin, y);
          y += 6;
        }
      }
      y += 4;
    }

    // Subject (with rich text support)
    if (renderedSubject.trim()) {
      doc.setFontSize(11);
      const subjectSegments = parseRichText(`Subject: ${renderedSubject}`);
      let currentX = margin;
      
      for (const seg of subjectSegments) {
        let fontStyle = 'bold'; // Subject is always bold by default
        if (seg.bold && seg.italic) fontStyle = 'bolditalic';
        else if (seg.italic) fontStyle = 'italic';
        
        doc.setFont('helvetica', fontStyle);
        if (seg.color) {
          const hex = seg.color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          doc.setTextColor(r, g, b);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        
        doc.text(seg.text, currentX, y);
        currentX += doc.getTextWidth(seg.text);
      }
      y += 10;
    }

    // Body (wrap + paginate with rich text formatting)
    doc.setFontSize(11);
    const lineHeight = 6;
    
    // Parse the rendered body into segments with formatting
    const bodySegments = parseRichText(renderedBody);
    
    // Process segments and handle text wrapping
    const paragraphs = renderedBody.split(/\n/);
    
    for (const para of paragraphs) {
      if (para.trim() === '') {
        // Empty paragraph - add space
        if (y > bottomLimit) {
          doc.addPage();
          drawHeaderFooter();
          drawWatermark();
          y = topStart;
        }
        y += lineHeight;
        continue;
      }
      
      // Parse this paragraph for formatting
      const paraSegments = parseRichText(para);
      let currentLine = '';
      let currentX = margin;
      
      for (const seg of paraSegments) {
        // Set font style based on segment
        let fontStyle = 'normal';
        if (seg.bold && seg.italic) fontStyle = 'bolditalic';
        else if (seg.bold) fontStyle = 'bold';
        else if (seg.italic) fontStyle = 'italic';
        
        doc.setFont('helvetica', fontStyle);
        if (seg.color) {
          // Parse hex color
          const hex = seg.color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          doc.setTextColor(r, g, b);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        
        // Handle text wrapping word by word
        const words = seg.text.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? ' ' : '');
          const testLine = currentLine + word;
          const testWidth = doc.getTextWidth(testLine);
          
          if (testWidth > contentWidth && currentLine !== '') {
            // Line is full, print it
            if (y > bottomLimit) {
              doc.addPage();
              drawHeaderFooter();
              drawWatermark();
              y = topStart;
            }
            doc.text(currentLine, currentX, y);
            y += lineHeight;
            currentLine = word;
            currentX = margin;
          } else {
            currentLine = testLine;
          }
        }
        
        // Print current segment and continue
        if (currentLine !== '') {
          const segWidth = doc.getTextWidth(currentLine);
          if (y > bottomLimit) {
            doc.addPage();
            drawHeaderFooter();
            drawWatermark();
            y = topStart;
          }
          doc.text(currentLine, currentX, y);
          currentX += segWidth;
          currentLine = '';
        }
      }
      
      // Move to next line after paragraph
      y += lineHeight;
    }

    const fileName = (draft.name || 'letter').replace(/[^\w-]+/g, '_').toLowerCase();
    doc.save(`${fileName}.pdf`);
  }, [renderedSubject, renderedBody, draft.name, meta, values, formatDate, watermark]);

  const allFilled = variables.every((v) => (values[v] || '').trim() !== '');

  return (
    <div className="letter-gen-page">
      <header className="letter-gen-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>Letter Generator</h1>
                <span className="subtitle">Template-based Letter Builder</span>
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

      <div className="letter-gen-body">
        {status && <div className="letter-gen-status">{status}</div>}

        <div className="letter-gen-grid">
          {/* Left: template editor + selection */}
          <div className="letter-gen-col">
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Template</h3>
                <div className="lg-actions">
                  <button className="lg-btn" onClick={handleNew}><Plus size={15} /> New</button>
                  <button className="lg-btn primary" onClick={handleSave} disabled={loading}>
                    <Save size={15} /> {draft.id ? 'Update' : 'Save'}
                  </button>
                  {draft.id && (
                    <button className="lg-btn danger" onClick={handleDelete} disabled={loading}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                  <button className="lg-btn" onClick={exportToJSON} title="Export letter as JSON">
                    <FileJson size={15} /> Export
                  </button>
                  <button className="lg-btn" onClick={() => fileInputRef.current?.click()} title="Load letter from JSON">
                    <Upload size={15} /> Load
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleLoadJSON}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <label className="lg-label">Load Saved Template</label>
              <div className="lg-load-row">
                <select
                  className="lg-select"
                  value={selectedId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                >
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button className="lg-btn" onClick={loadTemplates} title="Refresh">
                  <RefreshCw size={15} />
                </button>
              </div>

              <label className="lg-label">Template Name</label>
              <input
                className="lg-input"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g., Warranty Confirmation Letter"
              />

              <label className="lg-label">Subject</label>
              <input
                className="lg-input"
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                placeholder="e.g., Warranty for {{customer_name}}"
              />

              <label className="lg-label">
                Body <span className="lg-hint">Use {'{{variable}}'} for placeholders</span>
              </label>

              {/* Rich-text formatting toolbar */}
              <div className="lg-format-bar">
                <button
                  type="button"
                  className="lg-fmt-btn"
                  onClick={() => applyFormat(MARKERS.bold)}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className="lg-fmt-btn"
                  onClick={() => applyFormat(MARKERS.italic)}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  className="lg-fmt-btn"
                  onClick={() => applyFormat(MARKERS.underline)}
                  title="Underline"
                >
                  <Underline size={16} />
                </button>
                <div className="lg-color-wrap">
                  <button
                    type="button"
                    className="lg-fmt-btn"
                    onClick={() => setShowColors(!showColors)}
                    title="Text Colour"
                  >
                    <Palette size={16} />
                  </button>
                  {showColors && (
                    <div className="lg-color-pop">
                      {COLOR_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className="lg-swatch"
                          style={{ backgroundColor: hex }}
                          title={hex}
                          onClick={() => applyColor(hex)}
                        />
                      ))}
                      <label className="lg-swatch-custom" title="Custom colour">
                        <input
                          type="color"
                          onChange={(e) => applyColor(e.target.value)}
                        />
                        +
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <textarea
                className="lg-textarea"
                ref={bodyRef}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder={'Dear {{customer_name}},\n\nThis is to confirm that your {{product}} installed at {{address}} is covered...'}
                rows={14}
              />
            </div>

            {/* Optional letter meta above the subject: To / Address / Date */}
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Letter Details</h3>
                <span className="lg-hint">Toggle each block on or off</span>
              </div>

              <div className="lg-meta-row">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showDate}
                    onChange={(e) => handleMetaChange('showDate', e.target.checked)}
                  />
                  Date
                </label>
                <input
                  className="lg-input"
                  type="date"
                  value={meta.date}
                  disabled={!meta.showDate}
                  onChange={(e) => handleMetaChange('date', e.target.value)}
                />
              </div>

              <div className="lg-meta-block">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showTo}
                    onChange={(e) => handleMetaChange('showTo', e.target.checked)}
                  />
                  To (recipient)
                </label>
                <textarea
                  className="lg-textarea"
                  rows={2}
                  value={meta.to}
                  disabled={!meta.showTo}
                  onChange={(e) => handleMetaChange('to', e.target.value)}
                  placeholder={'The Manager,\n{{company_name}}'}
                />
              </div>

              <div className="lg-meta-block">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showAddress}
                    onChange={(e) => handleMetaChange('showAddress', e.target.checked)}
                  />
                  Address
                </label>
                <textarea
                  className="lg-textarea"
                  rows={2}
                  value={meta.address}
                  disabled={!meta.showAddress}
                  onChange={(e) => handleMetaChange('address', e.target.value)}
                  placeholder={'{{address}}\nGurugram, Haryana'}
                />
              </div>
            </div>

            {/* Dynamic fields generated from {{variables}} */}
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Fill Variables</h3>
                <span className="lg-count">{variables.length} field{variables.length === 1 ? '' : 's'}</span>
              </div>
              {variables.length === 0 ? (
                <p className="lg-empty">No {'{{variables}}'} found in the template yet. Add placeholders in the body or subject.</p>
              ) : (
                <div className="lg-fields">
                  {variables.map((name) => (
                    <div className="lg-field" key={name}>
                      <label>{humanizeVariable(name)}</label>
                      <input
                        type="text"
                        value={values[name] || ''}
                        onChange={(e) => handleValueChange(name, e.target.value)}
                        placeholder={`Enter ${humanizeVariable(name)}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Watermark Controls */}
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  {' '}Watermark
                </h3>
                {watermark.enabled && (
                  <button className="lg-btn danger" onClick={handleRemoveWatermark} title="Remove watermark">
                    <Trash2 size={15} /> Remove
                  </button>
                )}
              </div>
              
              {!watermark.enabled ? (
                <>
                  <p className="lg-empty">No watermark added yet.</p>
                  <button 
                    className="lg-btn primary" 
                    onClick={() => watermarkInputRef.current?.click()}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <Upload size={15} /> Upload Watermark Image
                  </button>
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkUpload}
                    style={{ display: 'none' }}
                  />
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280' }}>
                    <strong>{watermark.imageName}</strong>
                  </div>
                  
                  <label className="lg-label">
                    Size <span className="lg-hint">({watermark.size}% of page width)</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={watermark.size}
                    onChange={(e) => setWatermark(prev => ({ ...prev, size: Number(e.target.value) }))}
                    className="lg-slider"
                    style={{ width: '100%' }}
                  />
                  
                  <label className="lg-label">
                    Opacity <span className="lg-hint">({Math.round(watermark.opacity * 100)}%)</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watermark.opacity * 100}
                    onChange={(e) => setWatermark(prev => ({ ...prev, opacity: Number(e.target.value) / 100 }))}
                    className="lg-slider"
                    style={{ width: '100%' }}
                  />
                  
                  <div style={{ marginTop: '12px' }}>
                    <button
                      className={`lg-btn ${watermark.fixed ? '' : 'primary'}`}
                      onClick={() => setWatermark(prev => ({ ...prev, fixed: !prev.fixed }))}
                      style={{ width: '100%' }}
                    >
                      {watermark.fixed ? (
                        <>✓ Position Fixed</>
                      ) : (
                        <>📌 Fix Position (drag in preview first)</>
                      )}
                    </button>
                  </div>
                  
                  {!watermark.fixed && (
                    <div className="lg-hint" style={{ marginTop: '8px', textAlign: 'center' }}>
                      💡 Drag the watermark in the preview to position it
                    </div>
                  )}
                  
                  <button 
                    className="lg-btn" 
                    onClick={() => watermarkInputRef.current?.click()}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <Upload size={15} /> Change Image
                  </button>
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkUpload}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right: live preview */}
          <div className="letter-gen-col">
            <div className="lg-panel lg-preview-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Preview</h3>
                <button className="lg-btn primary" onClick={exportToPDF} disabled={!draft.body.trim()}>
                  <Download size={15} /> Export PDF
                </button>
              </div>
              {!allFilled && variables.length > 0 && (
                <div className="lg-warn">Some variables are still empty — they will render blank.</div>
              )}
              <div className="lg-letter-wrapper">
                <div className="lg-letter" ref={previewRef} style={{ position: 'relative' }}>
                {/* Watermark layer - positioned behind content */}
                {watermark.enabled && watermark.imageUrl && (
                  <>
                    <img
                      src={watermark.imageUrl}
                      alt="Watermark"
                      className={`lg-watermark ${watermark.fixed ? 'fixed' : 'draggable'}`}
                      style={{
                        position: 'absolute',
                        left: `${watermark.position.x}%`,
                        top: `${watermark.position.y}%`,
                        width: `${watermark.size}%`,
                        height: 'auto',
                        opacity: watermark.opacity,
                        pointerEvents: 'none',
                        zIndex: 0,
                        userSelect: 'none',
                      }}
                      draggable={false}
                    />
                    {/* Draggable overlay - only visible when not fixed */}
                    {!watermark.fixed && (
                      <div
                        className="lg-watermark-handle"
                        style={{
                          position: 'absolute',
                          left: `${watermark.position.x}%`,
                          top: `${watermark.position.y}%`,
                          width: `${watermark.size}%`,
                          height: `${watermark.size / watermark.aspectRatio}%`,
                          cursor: 'move',
                          zIndex: 2,
                          border: '2px dashed rgba(79, 70, 229, 0.6)',
                          background: 'rgba(79, 70, 229, 0.1)',
                          boxSizing: 'border-box',
                        }}
                        onMouseDown={handleWatermarkMouseDown}
                        title="Drag to reposition watermark"
                      />
                    )}
                  </>
                )}
                
                {/* Letter content - above watermark */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div className="lg-letter-head">
                    <img src="/SUNFEED LOGO.png" alt="Sunfeed" className="lg-letter-logo" />
                    <div className="lg-letter-corp">
                      <strong>Corporate Office:</strong><br />
                      Sunfeed Ecosolutions India (P) Ltd.<br />
                      527, 5th Floor, DLF Star Tower, NH-8<br />
                      Sector-30, Gurugram - 122001 (Haryana)<br />
                      GSTIN: 06AAWCS8301B1ZC
                    </div>
                  </div>
                  {meta.showDate && (
                    <div className="lg-letter-date">Date: {formatDate(meta.date)}</div>
                  )}
                  {meta.showTo && applyVariables(meta.to, values).trim() && (
                    <div className="lg-letter-to">
                      To,{'\n'}{applyVariables(meta.to, values)}
                    </div>
                  )}
                  {meta.showAddress && applyVariables(meta.address, values).trim() && (
                    <div className="lg-letter-address">{applyVariables(meta.address, values)}</div>
                  )}
                  {renderedSubject.trim() && (
                    <div className="lg-letter-subject">
                      <strong>Subject: <RichText text={renderedSubject} /></strong>
                    </div>
                  )}
                  <div className="lg-letter-body">
                    <RichText text={renderedBody} />
                  </div>
                </div>
              </div>
              </div> {/* Close lg-letter-wrapper */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LetterGenerator;
