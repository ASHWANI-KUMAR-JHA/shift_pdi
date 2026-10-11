import { supabase } from './supabase';
import { INSTALLATIONS_TABLE } from './installations';

/**
 * Check if RMS value indicates "not entered"
 * @param {string|null|undefined} rmsValue - The RMS status value
 * @returns {boolean} - True if RMS is not entered
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
 * Check if RMS value indicates "entered/enabled"
 * @param {string|null|undefined} rmsValue - The RMS status value
 * @returns {boolean} - True if RMS is entered
 */
export function isRMSEntered(rmsValue) {
  if (!rmsValue) return false;
  
  const normalized = String(rmsValue).trim().toLowerCase();
  const yesValues = [
    'yes', 'y', 'true', '1', 'enabled',
    'entered', 'uploaded', 'done', 'active'
  ];
  
  return yesValues.includes(normalized);
}

/**
 * Fetch installations based on RMS status filter with pagination
 * @param {Object} options - Query options
 * @param {string} options.search - Search term
 * @param {Object} options.filters - Filter values
 * @param {number} options.page - Current page (1-based)
 * @param {number} options.pageSize - Records per page
 * @returns {Promise<{data: Array, count: number}>}
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
    .order('created_at', { ascending: false })
    .range(from, to);

  // Apply RMS status filter
  const rmsStatus = filters.rmsStatus || 'NO';
  if (rmsStatus === 'NO') {
    query = query.or('rms.is.null,rms.eq.,rms.ilike.NO,rms.ilike.N,rms.ilike.FALSE,rms.ilike.PENDING,rms.ilike.NOT ENTERED,rms.ilike.NOT UPLOADED,rms.ilike.NOT DONE,rms.ilike.NO ENTRY,rms.ilike.DISABLED,rms.ilike.BLANK');
  } else if (rmsStatus === 'YES') {
    query = query.or('rms.ilike.YES,rms.ilike.Y,rms.ilike.TRUE,rms.ilike.1,rms.ilike.ENABLED,rms.ilike.ENTERED,rms.ilike.UPLOADED,rms.ilike.DONE,rms.ilike.ACTIVE');
  }
  // If 'ALL', don't add any RMS filter

  // Apply search across multiple fields
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

  // Apply individual filters
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
 * Fetch ALL records based on RMS status for export (bypassing pagination)
 * @param {Object} options - Query options
 * @param {string} options.search - Search term
 * @param {Object} options.filters - Filter values
 * @returns {Promise<Array>}
 */
export async function fetchAllRMSNotEnteredRecords({ search = '', filters = {} } = {}) {
  const batchSize = 1000;
  let from = 0;
  const all = [];

  for (;;) {
    let query = supabase
      .from(INSTALLATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + batchSize - 1);

    // Apply RMS status filter
    const rmsStatus = filters.rmsStatus || 'NO';
    if (rmsStatus === 'NO') {
      query = query.or('rms.is.null,rms.eq.,rms.ilike.NO,rms.ilike.N,rms.ilike.FALSE,rms.ilike.PENDING,rms.ilike.NOT ENTERED,rms.ilike.NOT UPLOADED,rms.ilike.NOT DONE,rms.ilike.NO ENTRY,rms.ilike.DISABLED,rms.ilike.BLANK');
    } else if (rmsStatus === 'YES') {
      query = query.or('rms.ilike.YES,rms.ilike.Y,rms.ilike.TRUE,rms.ilike.1,rms.ilike.ENABLED,rms.ilike.ENTERED,rms.ilike.UPLOADED,rms.ilike.DONE,rms.ilike.ACTIVE');
    }
    // If 'ALL', don't add any RMS filter

    // Apply search and filters (same as paginated version)
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

/**
 * Calculate statistics for RMS not-entered records
 * @param {Array} records - Array of installation records
 * @returns {Object} Statistics object
 */
export function calculateRMSStats(records) {
  const rmsNoCount = records.length;
  
  // Count distinct work orders
  const distinctProjects = new Set(
    records.map(r => r.work_order).filter(Boolean)
  ).size;
  
  return {
    totalRecords: rmsNoCount,
    rmsNoCount,
    distinctProjects
  };
}

/**
 * Extract unique filter options from records
 * @param {Array} records - Array of installation records
 * @returns {Object} Filter options object
 */
export function extractFilterOptions(records) {
  return {
    projects: [...new Set(records.map(r => r.project_name).filter(Boolean))].sort(),
    workOrders: [...new Set(records.map(r => r.work_order).filter(Boolean))].sort(),
    blocks: [...new Set(records.map(r => r.block).filter(Boolean))].sort(),
    creators: [...new Set(records.map(r => r.submitted_by).filter(Boolean))].sort()
  };
}

/**
 * Format record for CSV/Excel export
 * @param {Object} record - Installation record
 * @returns {Object} Formatted export record
 */
export function formatRecordForExport(record) {
  return {
    'Project': record.project_name || '—',
    'Work Order': record.work_order || '—',
    'S.No': record.sno || '—',
    'Location': record.exact_location || '—',
    'Coordinates': record.latitude && record.longitude 
      ? `${record.latitude}, ${record.longitude}` 
      : '—',
    'Village / Gram Panchayat': record.village || '—',
    'Block': record.block || '—',
    'Assembly': record.assembly_constituency || '—',
    'Commissioned': record.commissioning_date || '—',
    'Module SN': record.module_serial || '—',
    'Battery SN': record.battery_serial || '—',
    'Luminaire SN': record.luminaire_serial || '—',
    'RMS Status': record.rms || 'BLANK / NOT ENTERED',
    'Created': record.created_at 
      ? new Date(record.created_at).toLocaleDateString('en-GB')
      : '—',
    'Creator': record.submitted_by || '—'
  };
}
