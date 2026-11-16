/** Pure, offline inventory worksheet core. No persistence, network, or customer data. */
const validName = value => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80 && !/[<>\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(value);
const validCount = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
export function createWorksheet(rows = []) {
  if (!Array.isArray(rows) || rows.length > 100) throw Error('Invalid inventory rows');
  const ids = new Set();
  const items = rows.map((row, index) => {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(row.id) || ids.has(row.id) || !validName(row.name) || !validCount(row.count)) throw Error('Invalid inventory row ' + index);
    ids.add(row.id);
    return {id: row.id, name: row.name.trim(), count: row.count};
  });
  return {schemaVersion: 1, items, total: items.reduce((sum, row) => sum + row.count, 0)};
}
/** Reject incompatible or corrupted snapshots rather than silently dropping metadata. */
function readWorksheet(worksheet) {
  if (!worksheet || worksheet.schemaVersion !== 1 || !Array.isArray(worksheet.items)) throw Error('Invalid worksheet schema');
  const checked = createWorksheet(worksheet.items);
  if (worksheet.total !== checked.total) throw Error('Invalid worksheet total');
  return checked;
}
export function setCount(worksheet, id, count) {
  if (!validCount(count)) throw Error('Invalid count');
  const current = readWorksheet(worksheet);
  if (!current.items.some(row => row.id === id)) throw Error('Unknown item');
  return createWorksheet(current.items.map(row => row.id === id ? {...row, count} : row));
}
export function addItem(worksheet, item) {
  const current = readWorksheet(worksheet);
  return createWorksheet([...current.items, item]);
}
export function removeItem(worksheet, id) {
  const current = readWorksheet(worksheet);
  if (!current.items.some(row => row.id === id)) throw Error('Unknown item');
  return createWorksheet(current.items.filter(row => row.id !== id));
}


/** Rename a row without changing its stable ID, count, or caller-owned snapshot. */
export function renameItem(worksheet, id, name) {
  const current = readWorksheet(worksheet);
  if (!current.items.some(row => row.id === id)) throw Error('Unknown item');
  if (!validName(name)) throw Error('Invalid item name');
  return createWorksheet(current.items.map(row => row.id === id ? {...row, name} : row));
}

// Export a deterministic, spreadsheet-safe CSV snapshot. No filesystem or network I/O.
// Prefix formula-like names with a literal apostrophe to avoid spreadsheet execution.
export function toCsv(worksheet) {
  const current = readWorksheet(worksheet);
  const cell = value => {
    const raw = String(value);
    const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return ['id,name,count', ...current.items.map(item =>
    [item.id, item.name, item.count].map(cell).join(',')
  )].join('\r\n') + '\r\n';
}
