// Helpers for downloading installation site images — a single image or a bulk
// ZIP archive of several selected records.

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Pull the site image metadata ({ name, url, ... }) off a record, or null.
export function getSiteImage(record) {
  const img = record?.site_image || null;
  if (!img || !img.url) return null;
  const isImage =
    (img.type && img.type.startsWith('image/')) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(img.name || '');
  return isImage ? img : null;
}

// Build a readable, unique, filesystem-safe file name for a record's image.
// Falls back through S.No / location / id so files never collide in the zip.
function buildImageFileName(record, img, usedNames) {
  const ext = (() => {
    const m = /\.([a-z0-9]+)$/i.exec(img.name || '');
    if (m) return m[1].toLowerCase();
    if (img.type && img.type.includes('/')) return img.type.split('/')[1];
    return 'jpg';
  })();

  const parts = [];
  if (record.sno) parts.push(`SNo-${record.sno}`);
  if (record.exact_location) parts.push(record.exact_location);
  else if (record.village) parts.push(record.village);
  if (parts.length === 0) parts.push(`record-${record.id}`);

  let base = parts
    .join('_')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  if (!base) base = `record-${record.id}`;

  let name = `${base}.${ext}`;
  let n = 2;
  while (usedNames.has(name)) {
    name = `${base}_${n}.${ext}`;
    n += 1;
  }
  usedNames.add(name);
  return name;
}

// Fetch an image URL as a Blob. Public Supabase URLs are CORS-enabled.
async function fetchImageBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// Download a single record's site image.
export async function downloadInstallationImage(record) {
  const img = getSiteImage(record);
  if (!img) throw new Error('This record has no image to download.');
  const blob = await fetchImageBlob(img.url);
  const usedNames = new Set();
  const fileName = buildImageFileName(record, img, usedNames);
  saveAs(blob, fileName);
}

// Download the site images of the given records as a single ZIP archive.
// Records with no image are skipped. `onProgress({ done, total })` is called as
// each image is fetched so the UI can show progress.
// Returns { downloaded, skipped } counts.
export async function downloadInstallationImagesZip(records, onProgress) {
  const withImages = records
    .map((r) => ({ record: r, img: getSiteImage(r) }))
    .filter((x) => x.img);

  const total = withImages.length;
  if (total === 0) {
    throw new Error('None of the selected records have an image to download.');
  }

  const zip = new JSZip();
  const usedNames = new Set();
  let done = 0;
  let failed = 0;

  for (const { record, img } of withImages) {
    onProgress?.({ done, total });
    try {
      const blob = await fetchImageBlob(img.url);
      const fileName = buildImageFileName(record, img, usedNames);
      zip.file(fileName, blob);
    } catch {
      failed += 1;
    }
    done += 1;
    onProgress?.({ done, total });
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(content, `installation-images_${stamp}.zip`);

  return { downloaded: total - failed, skipped: records.length - total, failed };
}
