# RMS Not Entered Report - Implementation Logic

## Overview
This document outlines the implementation plan for creating a "RMS Not Entered Report" feature based on the HTML prototype. This feature will integrate with the existing Shift PDI React application to display installation records where RMS status is "NO", "N", "FALSE", "PENDING", "NOT ENTERED", or blank.

---

## 1. Feature Analysis from HTML Prototype

### Current HTML Implementation Features:
1. **File Upload**: Accepts Excel (.xlsx, .xls) and CSV files
2. **Dashboard Cards**: Shows statistics (Total, RMS NO count, RMS YES count, Distinct Work Orders)
3. **Search & Filtering**: 
   - Text search across multiple fields
   - Dropdown filters for: Project, Work Order, Block, Creator
4. **Data Table**: Displays filtered results with 15 columns
5. **Export Functions**: Download as Excel, CSV, or Print/PDF
6. **Client-side Processing**: All data parsing and filtering done in browser
7. **Sample Data**: Includes a "View Sample" button for demo

### Key Logic Components:
- **RMS Detection Logic**: Identifies "NO" records using `isNo()` function
- **Column Mapping**: Flexible column name matching (handles variations)
- **CSV Parsing**: Custom parser for pasted/uploaded data
- **Excel Integration**: Uses SheetJS (xlsx.js) library

---

## 2. Integration Approach with Existing System

### A. Component Architecture

#### New Component: `RMSNotEnteredReport.jsx`
**Location**: `src/components/RMSNotEnteredReport.jsx`

**Purpose**: Standalone report view that shows only RMS="NO" installations

**Key Features**:
- Fetches data from Supabase `installations` table
- Filters records where `rms` field is NO/N/FALSE/PENDING/blank
- Provides search, filter, and export capabilities
- Integrates with existing auth and navigation

#### CSS File: `RMSNotEnteredReport.css`
**Location**: `src/components/RMSNotEnteredReport.css`

**Style Approach**: 
- Maintain consistency with existing UI (similar to InstallationRegister)
- Use existing CSS variables (--navy, --purple, --green, etc.)
- Responsive design for mobile/tablet/desktop

---

## 3. Data Flow & Architecture

### Data Sources

#### Option A: Fetch from Supabase (Recommended)
```javascript
// Fetch installations where RMS is not entered
async function fetchRMSNotEnteredRecords({ search = '', filters = {}, page = 1, pageSize = 100 }) {
  let query = supabase
    .from('installations')
    .select('*', { count: 'exact' })
    .or('rms.is.null,rms.eq.,rms.ilike.NO,rms.ilike.N,rms.ilike.FALSE,rms.ilike.PENDING,rms.ilike.NOT ENTERED')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  
  // Apply search filter
  if (search) {
    const term = `%${search}%`;
    query = query.or([
      `project_name.ilike.${term}`,
      `work_order.ilike.${term}`,
      `village.ilike.${term}`,
      `exact_location.ilike.${term}`,
      `module_serial.ilike.${term}`,
      `battery_serial.ilike.${term}`,
      `luminaire_serial.ilike.${term}`
    ].join(','));
  }
  
  // Apply dropdown filters
  if (filters.project) query = query.eq('project_name', filters.project);
  if (filters.workOrder) query = query.eq('work_order', filters.workOrder);
  if (filters.block) query = query.eq('block', filters.block);
  if (filters.creator) query = query.eq('submitted_by', filters.creator);
  
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}
```

#### Option B: Client-side Filtering (Fallback)
- Fetch all installations
- Filter client-side using `isNo()` logic
- Use for smaller datasets or when Supabase query is complex

---

## 4. Component Structure

### State Management

```javascript
const [records, setRecords] = useState([]);           // All RMS NO records
const [filteredRecords, setFilteredRecords] = useState([]); // After search/filters
const [loading, setLoading] = useState(false);
const [search, setSearch] = useState('');
const [filters, setFilters] = useState({
  project: '',
  workOrder: '',
  block: '',
  creator: ''
});
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [stats, setStats] = useState({
  totalRecords: 0,
  rmsNoCount: 0,
  rmsYesCount: 0,
  distinctProjects: 0
});
```

### Core Functions

#### 1. Data Fetching
```javascript
const loadRecords = useCallback(async () => {
  setLoading(true);
  try {
    const { data, count } = await fetchRMSNotEnteredRecords({
      search,
      filters,
      page,
      pageSize: 100
    });
    setRecords(data);
    setTotal(count);
    calculateStats(data);
  } catch (err) {
    console.error('Failed to load records:', err);
  } finally {
    setLoading(false);
  }
}, [search, filters, page]);
```

#### 2. RMS Detection Logic
```javascript
function isRMSNotEntered(rmsValue) {
  if (!rmsValue) return true; // null, undefined, or empty string
  
  const normalized = String(rmsValue).trim().toLowerCase();
  
  const noValues = [
    'no', 'n', 'false', '0', 'pending', 
    'not entered', 'not uploaded', 'not done', 
    'no entry', 'disabled', 'blank'
  ];
  
  return noValues.includes(normalized);
}
```

#### 3. Statistics Calculation
```javascript
function calculateStats(data) {
  const rmsNoCount = data.length;
  
  // Count distinct work orders
  const distinctProjects = new Set(
    data.map(r => r.work_order).filter(Boolean)
  ).size;
  
  setStats({
    totalRecords: data.length,
    rmsNoCount,
    distinctProjects
  });
}
```

#### 4. Filter Options Generation
```javascript
const filterOptions = useMemo(() => {
  return {
    projects: [...new Set(records.map(r => r.project_name).filter(Boolean))].sort(),
    workOrders: [...new Set(records.map(r => r.work_order).filter(Boolean))].sort(),
    blocks: [...new Set(records.map(r => r.block).filter(Boolean))].sort(),
    creators: [...new Set(records.map(r => r.submitted_by).filter(Boolean))].sort()
  };
}, [records]);
```

#### 5. Export Functions

##### Excel Export
```javascript
const exportToExcel = useCallback(async () => {
  try {
    // Import xlsx dynamically
    const XLSX = await import('xlsx');
    
    const exportData = filteredRecords.map(r => ({
      'Project': r.project_name || '—',
      'Work Order': r.work_order || '—',
      'S.No': r.sno || '—',
      'Location': r.exact_location || '—',
      'Coordinates': r.latitude && r.longitude 
        ? `${r.latitude}, ${r.longitude}` 
        : '—',
      'Village / Gram Panchayat': r.village || '—',
      'Block': r.block || '—',
      'Assembly': r.assembly_constituency || '—',
      'Commissioned': r.commissioning_date || '—',
      'Module SN': r.module_serial || '—',
      'Battery SN': r.battery_serial || '—',
      'Luminaire SN': r.luminaire_serial || '—',
      'RMS Status': r.rms || 'BLANK / NOT ENTERED',
      'Created': r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
      'Creator': r.submitted_by || '—'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RMS Not Entered');
    
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RMS_Not_Entered_Report_${date}.xlsx`);
  } catch (err) {
    console.error('Excel export failed:', err);
    alert('Export failed. Please try CSV export instead.');
  }
}, [filteredRecords]);
```

##### CSV Export
```javascript
const exportToCSV = useCallback(() => {
  const headers = [
    'Project', 'Work Order', 'S.No', 'Location', 'Coordinates',
    'Village / Gram Panchayat', 'Block', 'Assembly', 'Commissioned',
    'Module SN', 'Battery SN', 'Luminaire SN', 'RMS Status', 'Created', 'Creator'
  ];
  
  const escapeCSV = (value) => {
    const str = value == null ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  
  const rows = filteredRecords.map(r => [
    r.project_name || '—',
    r.work_order || '—',
    r.sno || '—',
    r.exact_location || '—',
    r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '—',
    r.village || '—',
    r.block || '—',
    r.assembly_constituency || '—',
    r.commissioning_date || '—',
    r.module_serial || '—',
    r.battery_serial || '—',
    r.luminaire_serial || '—',
    r.rms || 'BLANK / NOT ENTERED',
    r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
    r.submitted_by || '—'
  ]);
  
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');
  
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
}, [filteredRecords]);
```

---

## 5. UI Components Breakdown

### Header Section
```jsx
<header className="rms-report-header">
  <div className="logo">
    <Logo size="medium" />
    <div>
      <h1>RMS Not Entered Register</h1>
      <p>PDI → JCR | Solar Street Light Installation Tracking</p>
    </div>
  </div>
  <div className="header-actions">
    <button onClick={onBack}>
      <ArrowLeft /> Back to Dashboard
    </button>
    <button onClick={onLogout}>
      <LogOut /> Logout
    </button>
  </div>
</header>
```

### Statistics Cards
```jsx
<section className="stats-cards">
  <StatCard 
    label="Total Records Loaded" 
    value={stats.totalRecords}
    icon={<FileText />}
  />
  <StatCard 
    label="RMS Not Entered (NO)" 
    value={stats.rmsNoCount}
    variant="danger"
    icon={<AlertCircle />}
  />
  <StatCard 
    label="Distinct Work Orders" 
    value={stats.distinctProjects}
    icon={<Package />}
  />
</section>
```

### Toolbar Section
```jsx
<section className="toolbar">
  <div className="search-box">
    <Search size={16} />
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search project, work order, village, location..."
    />
  </div>
  
  <button onClick={loadRecords} disabled={loading}>
    <RefreshCw size={16} /> {loading ? 'Loading...' : 'Refresh'}
  </button>
  
  <button onClick={exportToExcel}>
    <Download size={16} /> Download Excel
  </button>
  
  <button onClick={exportToCSV}>
    <Download size={16} /> Download CSV
  </button>
  
  <button onClick={() => window.print()}>
    <Printer size={16} /> Print / Save PDF
  </button>
</section>
```

### Filter Section
```jsx
<section className="filters-panel">
  <h2>Search & Filter — RMS = NO</h2>
  <div className="filters-grid">
    <select value={filters.project} onChange={(e) => setFilters({...filters, project: e.target.value})}>
      <option value="">All Projects</option>
      {filterOptions.projects.map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
    
    <select value={filters.workOrder} onChange={(e) => setFilters({...filters, workOrder: e.target.value})}>
      <option value="">All Work Orders</option>
      {filterOptions.workOrders.map(wo => (
        <option key={wo} value={wo}>{wo}</option>
      ))}
    </select>
    
    <select value={filters.block} onChange={(e) => setFilters({...filters, block: e.target.value})}>
      <option value="">All Blocks</option>
      {filterOptions.blocks.map(b => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>
    
    <select value={filters.creator} onChange={(e) => setFilters({...filters, creator: e.target.value})}>
      <option value="">All Creators</option>
      {filterOptions.creators.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  </div>
  
  {Object.values(filters).some(Boolean) && (
    <button onClick={() => setFilters({ project: '', workOrder: '', block: '', creator: '' })}>
      <X size={14} /> Clear Filters
    </button>
  )}
</section>
```

### Data Table
```jsx
<section className="table-panel">
  <div className="table-header">
    <h2>RMS Not Entered — Pending for PDI / JCR</h2>
    <span className="count">{filteredRecords.length} records</span>
  </div>
  
  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
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
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan="15" className="loading">Loading records...</td></tr>
        ) : filteredRecords.length === 0 ? (
          <tr><td colSpan="15" className="empty">No RMS-not-entered records found.</td></tr>
        ) : (
          filteredRecords.map(record => (
            <tr key={record.id}>
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
                <span className="status-badge danger">
                  {record.rms || 'BLANK / NOT ENTERED'}
                </span>
              </td>
              <td>
                {record.created_at 
                  ? new Date(record.created_at).toLocaleDateString() 
                  : '—'}
              </td>
              <td>{record.submitted_by || '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
  
  {/* Pagination */}
  {total > 100 && (
    <div className="pagination">
      <button onClick={() => setPage(1)} disabled={page === 1}>
        <ChevronsLeft size={16} />
      </button>
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        <ChevronLeft size={16} />
      </button>
      <span>Page {page} of {Math.ceil(total / 100)}</span>
      <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 100)}>
        <ChevronRight size={16} />
      </button>
      <button onClick={() => setPage(Math.ceil(total / 100))} disabled={page >= Math.ceil(total / 100)}>
        <ChevronsRight size={16} />
      </button>
    </div>
  )}
</section>
```

---

## 6. Utility Functions

### Create new utility file: `src/utils/rmsReport.js`

```javascript
import { supabase } from './supabase';
import { INSTALLATIONS_TABLE } from './installations';

/**
 * Check if RMS value indicates "not entered"
 */
export function isRMSNotEntered(rmsValue) {
  if (!rmsValue) return true;
  
  const normalized = String(rmsValue).trim().toLowerCase();
  const noValues = [
    'no', 'n', 'false', '0', 'pending',
    'not entered', 'not uploaded', 'not done',
    'no entry', 'disabled', 'blank'
  ];
  
  return noValues.includes(normalized);
}

/**
 * Fetch installations where RMS is not entered
 */
export async function fetchRMSNotEnteredRecords({
  search = '',
  filters = {},
  page = 1,
  pageSize = 100
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(INSTALLATIONS_TABLE)
    .select('*', { count: 'exact' })
    .or('rms.is.null,rms.eq.,rms.ilike.NO,rms.ilike.N,rms.ilike.FALSE,rms.ilike.PENDING,rms.ilike.NOT ENTERED,rms.ilike.NOT UPLOADED,rms.ilike.NOT DONE,rms.ilike.NO ENTRY,rms.ilike.DISABLED,rms.ilike.BLANK')
    .order('created_at', { ascending: false })
    .range(from, to);

  // Apply search
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or([
      `project_name.ilike.${term}`,
      `work_order.ilike.${term}`,
      `exact_location.ilike.${term}`,
      `village.ilike.${term}`,
      `module_serial.ilike.${term}`,
      `battery_serial.ilike.${term}`,
      `luminaire_serial.ilike.${term}`,
      `sno.ilike.${term}`
    ].join(','));
  }

  // Apply filters
  if (filters.project) {
    query = query.eq('project_name', filters.project);
  }
  if (filters.workOrder) {
    query = query.eq('work_order', filters.workOrder);
  }
  if (filters.block) {
    query = query.eq('block', filters.block);
  }
  if (filters.creator) {
    query = query.eq('submitted_by', filters.creator);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data || [], count: count || 0 };
}

/**
 * Fetch ALL RMS not-entered records for export (bypassing pagination)
 */
export async function fetchAllRMSNotEnteredRecords({ search = '', filters = {} } = {}) {
  const batchSize = 1000;
  let from = 0;
  const all = [];

  for (;;) {
    let query = supabase
      .from(INSTALLATIONS_TABLE)
      .select('*')
      .or('rms.is.null,rms.eq.,rms.ilike.NO,rms.ilike.N,rms.ilike.FALSE,rms.ilike.PENDING,rms.ilike.NOT ENTERED')
      .order('created_at', { ascending: false })
      .range(from, from + batchSize - 1);

    // Apply search and filters (same as above)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or([
        `project_name.ilike.${term}`,
        `work_order.ilike.${term}`,
        `exact_location.ilike.${term}`,
        `village.ilike.${term}`,
        `module_serial.ilike.${term}`,
      ].join(','));
    }

    if (filters.project) query = query.eq('project_name', filters.project);
    if (filters.workOrder) query = query.eq('work_order', filters.workOrder);
    if (filters.block) query = query.eq('block', filters.block);
    if (filters.creator) query = query.eq('submitted_by', filters.creator);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return all;
}
```

---

## 7. Navigation Integration

### Update App.jsx routing

```javascript
// Add to App.jsx state
const [currentPage, setCurrentPage] = useState('dashboard');

// Add route handler
case 'rms-report':
  return (
    <RMSNotEnteredReport
      onBack={() => setCurrentPage('dashboard')}
      onLogout={handleLogout}
    />
  );

// Add navigation button to Dashboard
<button onClick={() => setCurrentPage('rms-report')}>
  <AlertCircle /> RMS Not Entered Report
</button>
```

---

## 8. Styling Guidelines

### Key CSS Classes

```css
/* Container */
.rms-report-page {
  min-height: 100vh;
  background: var(--bg);
}

/* Header */
.rms-report-header {
  background: var(--navy);
  color: white;
  padding: 15px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.stat-card.danger .stat-value {
  color: var(--red);
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* Filters */
.filters-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 0 20px 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  max-height: 65vh;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1400px;
}

.table-wrapper th {
  background: var(--navy);
  color: white;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
}

.table-wrapper td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}

.table-wrapper tbody tr:hover {
  background: #f8f8ff;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.danger {
  background: #ffe8e9;
  color: #b42330;
}

/* Print Styles */
@media print {
  .toolbar,
  .filters-panel,
  .rms-report-header button {
    display: none !important;
  }
  
  .table-wrapper {
    max-height: none;
    overflow: visible;
  }
}
```

---

## 9. Testing Checklist

### Functional Testing
- [ ] Data loads correctly from Supabase
- [ ] RMS filtering logic works (catches all NO variants)
- [ ] Search functionality works across all fields
- [ ] Dropdown filters work individually and in combination
- [ ] Pagination works correctly
- [ ] Statistics cards show accurate counts
- [ ] Excel export generates valid file with correct data
- [ ] CSV export generates valid file with UTF-8 BOM
- [ ] Print/PDF function works
- [ ] Empty state shows when no records found
- [ ] Loading states display correctly

### Edge Cases
- [ ] Handle null/undefined RMS values
- [ ] Handle empty search results
- [ ] Handle network errors gracefully
- [ ] Handle large datasets (1000+ records)
- [ ] Handle special characters in data
- [ ] Handle missing optional fields

### Performance Testing
- [ ] Initial load time < 2 seconds
- [ ] Search debouncing works (no lag)
- [ ] Export completes for 1000+ records
- [ ] Table scrolling is smooth
- [ ] No memory leaks on repeated use

### Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Responsiveness
- [ ] Cards stack vertically on mobile
- [ ] Table scrolls horizontally on small screens
- [ ] Filters are usable on mobile
- [ ] Buttons are touch-friendly

---

## 10. Implementation Steps

### Phase 1: Setup (Day 1)
1. Create `RMSNotEnteredReport.jsx` component file
2. Create `RMSNotEnteredReport.css` stylesheet
3. Create `src/utils/rmsReport.js` utility file
4. Add route to `App.jsx`
5. Add navigation button to Dashboard

### Phase 2: Core Functionality (Day 2)
1. Implement data fetching from Supabase
2. Implement RMS filtering logic
3. Build statistics cards component
4. Build data table with all columns
5. Add loading and empty states

### Phase 3: Search & Filters (Day 3)
1. Implement text search
2. Build dropdown filters
3. Implement filter combinations
4. Add "Clear Filters" functionality
5. Add debouncing to search

### Phase 4: Export Features (Day 4)
1. Implement Excel export (with xlsx library)
2. Implement CSV export
3. Add print styles
4. Test exports with large datasets
5. Handle export errors

### Phase 5: Polish & Testing (Day 5)
1. Add responsive styles
2. Implement pagination (if needed)
3. Add error handling
4. Conduct thorough testing
5. Fix bugs and edge cases
6. Documentation and code comments

---

## 11. Future Enhancements

### Short-term (v1.1)
- Add sorting by column headers
- Add date range filter (created_at)
- Add "Export Selected" functionality
- Add bulk update RMS status

### Medium-term (v1.2)
- Real-time updates (WebSocket/Supabase realtime)
- Email report scheduling
- Advanced filters (OR/AND logic)
- Save filter presets

### Long-term (v2.0)
- Analytics dashboard (trends, charts)
- Integration with RMS portal API
- Automated reminders for pending entries
- Mobile app version

---

## 12. Dependencies

### Required npm Packages
```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "lucide-react": "^0.263.1",
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

### Browser Requirements
- Modern browser with ES6+ support
- Local Storage support
- CSV download support

---

## 13. Security Considerations

1. **Authentication**: Ensure user is logged in before accessing report
2. **Authorization**: Verify user has permission to view installation data
3. **SQL Injection**: Use parameterized queries (Supabase handles this)
4. **XSS Prevention**: Sanitize all user inputs and data display
5. **Data Privacy**: Don't expose sensitive fields in exports
6. **Rate Limiting**: Implement on API endpoints if needed

---

## 14. Performance Optimization

1. **Lazy Loading**: Load data on demand (pagination)
2. **Debouncing**: Search input debounced to 400ms
3. **Memoization**: Use `useMemo` for expensive calculations
4. **Virtual Scrolling**: Consider for very large datasets (1000+ rows)
5. **Index Optimization**: Ensure Supabase has index on `rms` column
6. **Caching**: Cache filter options to reduce re-computation

---

## 15. Accessibility (A11y)

1. Semantic HTML elements
2. ARIA labels for interactive elements
3. Keyboard navigation support
4. Focus indicators
5. Screen reader friendly table
6. Color contrast compliance (WCAG AA)
7. Alt text for icons

---

## Summary

This implementation plan provides a comprehensive blueprint for creating the RMS Not Entered Report feature. The approach:

✅ **Integrates seamlessly** with existing Shift PDI architecture  
✅ **Reuses components** and utilities where possible  
✅ **Maintains consistency** with existing UI/UX patterns  
✅ **Scales efficiently** with pagination and optimized queries  
✅ **Provides full functionality** matching the HTML prototype  
✅ **Follows best practices** for React, security, and performance  

**Next Step**: Begin Phase 1 implementation by creating the component files and setting up the basic structure.
