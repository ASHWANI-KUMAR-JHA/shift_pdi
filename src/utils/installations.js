import { supabase } from './supabase';
import { readSheetRows, textToRows } from './spreadsheet';
import { releaseInstallationWorkOrderItems } from './workorders';

// Table name in Supabase
export const INSTALLATIONS_TABLE = 'installations';

// Column keys used across the form, dashboard and Supabase.
// `key` maps to the DB column, `label` is shown in the UI.
export const INSTALLATION_FIELDS = [
  { key: 'project_name', label: 'Project Name' },
  { key: 'work_order', label: 'Work Order' },
  { key: 'sno', label: 'S.No.' },
  { key: 'exact_location', label: 'Exact Location (Landmark)' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'photo_date', label: 'Photo Date' },
  { key: 'village', label: 'Village / Gram Panchayat' },
  { key: 'block', label: 'Name of Block' },
  { key: 'assembly_constituency', label: 'Assembly Constituency' },
  { key: 'state', label: 'State' },
  { key: 'commissioning_date', label: 'Date of Commissioning' },
  { key: 'module_serial', label: 'Module Serial Number' },
  { key: 'battery_serial', label: 'Battery Serial Number' },
  { key: 'luminaire_serial', label: 'Luminaire Serial Number' },
  { key: 'rms', label: 'RMS' },
];

// File-upload columns (Supabase JSONB). Keys are preserved end-to-end:
//  - site_image / signed_pdf : single file metadata object (or null)
//  - attachments             : array of file metadata objects
// Each metadata object: { name, path, url, size, type }.
export const INSTALLATION_FILE_FIELDS = ['site_image', 'signed_pdf', 'attachments'];

// An empty installation row used to seed the form.
export function emptyInstallation() {
  return {
    project_name: '',
    work_order: '',
    sno: '',
    exact_location: '',
    latitude: '',
    longitude: '',
    photo_date: '',
    village: '',
    block: '',
    assembly_constituency: '',
    state: '',
    commissioning_date: '',
    module_serial: '',
    battery_serial: '',
    luminaire_serial: '',
    rms: 'YES',
    site_image: null,
    signed_pdf: null,
    attachments: [],
  };
}

// Optional extra columns preserved on insert/update when present. `submitted_by`
// records the logged-in user's name from the public form. It only persists if
// the matching column exists in Supabase (see supabase_installations_submitted_by.sql).
const OPTIONAL_FIELDS = ['submitted_by'];

// Normalize a row before inserting: convert empty strings to null so
// nullable columns (project_name, work_order, etc.) stay clean.
function normalizeRow(row) {
  const out = {};
  for (const { key } of INSTALLATION_FIELDS) {
    let value = row[key];
    if (typeof value === 'string') value = value.trim();
    out[key] = value === '' || value === undefined ? null : value;
  }
  for (const key of OPTIONAL_FIELDS) {
    if (row[key] !== undefined) {
      let value = row[key];
      if (typeof value === 'string') value = value.trim();
      out[key] = value === '' ? null : value;
    }
  }
  // File-upload JSONB fields are passed through as-is (objects / arrays).
  for (const key of INSTALLATION_FILE_FIELDS) {
    if (row[key] !== undefined) {
      const value = row[key];
      if (key === 'attachments') {
        out[key] = Array.isArray(value) && value.length ? value : null;
      } else {
        out[key] = value || null;
      }
    }
  }
  return out;
}

// Apply the optional text search to a query builder.
function applySearch(query, search) {
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      [
        `project_name.ilike.${term}`,
        `work_order.ilike.${term}`,
        `exact_location.ilike.${term}`,
        `village.ilike.${term}`,
        `module_serial.ilike.${term}`,
      ].join(',')
    );
  }
  return query;
}

// Fetch a single page of installations, most recent first.
// Returns { data, count } where count is the total matching rows.
// `page` is 1-based; `pageSize` defaults to 100.
export async function fetchInstallationsPage({ search = '', page = 1, pageSize = 100 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(INSTALLATIONS_TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  query = applySearch(query, search);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count ?? 0 };
}

// Fetch ALL matching installations by paging through Supabase in batches,
// working around the default 1000-row cap. Used for exports.
export async function fetchInstallations({ search = '' } = {}) {
  const batchSize = 1000;
  let from = 0;
  const all = [];

  for (;;) {
    let query = supabase
      .from(INSTALLATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + batchSize - 1);

    query = applySearch(query, search);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return all;
}

// Insert a batch of rows. Empty rows (no meaningful data) are skipped.
export async function insertInstallations(rows) {
  const payload = rows
    .filter((r) =>
      INSTALLATION_FIELDS.some(
        ({ key }) => key !== 'rms' && String(r[key] ?? '').trim() !== ''
      )
    )
    .map(normalizeRow);

  if (payload.length === 0) {
    return { inserted: 0, data: [] };
  }

  const { data, error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .insert(payload)
    .select();

  if (error) throw error;
  return { inserted: data?.length || 0, data: data || [] };
}

// Update a single installation record by id.
export async function updateInstallation(id, row) {
  const payload = normalizeRow(row);
  const { data, error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .update(payload)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Compute the next incremental S.No for a work order. Looks at existing
// installations for the given work order, finds the highest numeric S.No and
// returns the next value as a string. If there are none (or none are numeric),
// returns '1'. Used by the public form so field staff don't enter S.No.
export async function getNextSnoForWorkOrder(workOrder) {
  const wo = String(workOrder || '').trim();
  if (!wo) return '1';
  const { data, error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .select('sno')
    .eq('work_order', wo);
  if (error) throw error;
  let max = 0;
  for (const row of data || []) {
    const n = parseInt(String(row.sno ?? '').trim(), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

// Reassign S.No to ALL installations (matching an optional search), ordered by
// date, starting from `start`. The oldest record gets `start`, the next gets
// `start + 1`, and so on. Returns { updated }.
// `orderBy` defaults to 'created_at' (chronological). Updates run in batches of
// equal values grouped by the new sno via individual updates.
export async function resequenceInstallationsSno({ start, search = '', orderBy = 'created_at' } = {}) {
  const base = Number(start);
  if (!Number.isFinite(base)) throw new Error('Start value must be a number.');

  // Fetch every matching row (paging past the 1000-row cap), ordered by date
  // ascending so the earliest installation receives the starting number.
  const batchSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    let query = supabase
      .from(INSTALLATIONS_TABLE)
      .select('id, created_at')
      .order(orderBy, { ascending: true })
      .range(from, from + batchSize - 1);
    query = applySearch(query, search);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  if (all.length === 0) return { updated: 0 };

  // Assign sequential S.No values and update each row.
  let updated = 0;
  let n = base;
  for (const row of all) {
    const { error } = await supabase
      .from(INSTALLATIONS_TABLE)
      .update({ sno: String(n) })
      .eq('id', row.id);
    if (error) throw error;
    updated += 1;
    n += 1;
  }
  return { updated };
}

// Set RMS status for many installation records at once.
export async function setInstallationsRms(ids, rms = 'YES') {
  const list = (ids || []).filter(Boolean);
  if (list.length === 0) return { updated: 0 };
  const { data, error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .update({ rms })
    .in('id', list)
    .select();
  if (error) throw error;
  return { updated: data?.length || 0, data: data || [] };
}

export async function deleteInstallation(id) {
  // Load the row first so we can release its work order serials after deletion.
  const { data: existing } = await supabase
    .from(INSTALLATIONS_TABLE)
    .select('work_order, module_serial, battery_serial, luminaire_serial')
    .eq('id', id)
    .limit(1);
  const row = existing?.[0] || null;

  const { error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;

  // Mark the consumed work order items as available again. Non-fatal: the
  // installation is already deleted, so a release failure shouldn't surface
  // as a delete failure.
  if (row) {
    try {
      await releaseInstallationWorkOrderItems(row);
    } catch (err) {
      console.warn('Could not release work order items on delete:', err);
    }
  }
}

// Parse pasted tabular data (TSV from Excel / Google Sheets or CSV).
// Expected column order matches your register:
// S.No | Location | Latitude | Longitude | Village/Gram Panchayat |
// Block | Assembly | CommissioningDate | Module | Battery | Luminaire | RMS
export function parsePastedRows(text, { projectName = '', workOrder = '' } = {}) {
  return rowsToInstallations(textToRows(text), { projectName, workOrder });
}

// Map an array-of-arrays (rows of cells) into installation records.
// Shared by pasted text, CSV/TSV and Excel uploads.
function rowsToInstallations(cellRows, { projectName = '', workOrder = '' } = {}) {
  const rows = [];

  for (const cells of cellRows) {
    // Skip a header row if present.
    const first = (cells[0] || '').toLowerCase();
    if (/^(s\.?\s*no\.?|sr\.?no\.?)$/.test(first)) continue;
    if (cells.every((c) => String(c).trim() === '')) continue;

    const [
      sno,
      exact_location,
      latitude,
      longitude,
      village,
      block,
      assembly_constituency,
      commissioning_date,
      module_serial,
      battery_serial,
      luminaire_serial,
      rms,
    ] = cells;

    rows.push({
      ...emptyInstallation(),
      project_name: projectName,
      work_order: workOrder,
      sno: sno || '',
      exact_location: exact_location || '',
      latitude: latitude || '',
      longitude: longitude || '',
      village: village || '',
      block: block || '',
      assembly_constituency: assembly_constituency || '',
      commissioning_date: commissioning_date || '',
      module_serial: module_serial || '',
      battery_serial: battery_serial || '',
      luminaire_serial: luminaire_serial || '',
      rms: rms || 'YES',
    });
  }

  return rows;
}

// Read an uploaded spreadsheet and return parsed installation rows.
// Accepts .xlsx / .xls / .csv / .tsv / .txt (Excel binary files are decoded
// with SheetJS so they no longer arrive corrupted).
export async function parseUploadedFile(file, { projectName = '', workOrder = '' } = {}) {
  const cellRows = await readSheetRows(file);
  return rowsToInstallations(cellRows, { projectName, workOrder });
}
