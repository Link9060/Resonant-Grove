/** Pure, offline inventory worksheet core. No persistence, network, or customer data. */
const validName = value => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80 && !/[<>\u0000-\u001f\u007f\u0085\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/.test(value);
const validCount = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
export function createWorksheet(rows = []) {
  if (!Array.isArray(rows) || rows.length > 100 || Reflect.ownKeys(rows).filter(key => key !== 'length').some(key => typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= rows.length) || Array.from({length: rows.length}, (_, i) => Object.hasOwn(rows, i)).includes(false)) throw Error('Invalid inventory rows');
  const ids = new Set();
  const items = rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Reflect.ownKeys(row).some(key => !['id', 'name', 'count'].includes(key)) || !['id', 'name', 'count'].every(key => Object.hasOwn(row, key)) || typeof row.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(row.id) || ids.has(row.id) || !validName(row.name) || !validCount(row.count)) throw Error('Invalid inventory row ' + index);
    ids.add(row.id);
    return {id: row.id, name: row.name.trim(), count: row.count};
  });
  return {schemaVersion: 1, items, total: items.reduce((sum, row) => sum + row.count, 0)};
}
/** Reject incompatible or corrupted snapshots rather than silently dropping metadata. */
function readWorksheet(worksheet) {
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet) || !['schemaVersion', 'items', 'total'].every(key => Object.hasOwn(worksheet, key)) || worksheet.schemaVersion !== 1 || !Array.isArray(worksheet.items)) throw Error('Invalid worksheet schema');
  if (Reflect.ownKeys(worksheet).some(key => !['schemaVersion', 'items', 'total'].includes(key))) throw Error('Invalid worksheet metadata');
  if (worksheet.items.some(row => !row || typeof row !== 'object' || Object.keys(row).some(key => !['id', 'name', 'count'].includes(key)))) throw Error('Invalid inventory row metadata');
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

/** Return a read-only search result snapshot without changing inventory or totals. */
export function searchItems(worksheet, query) {
  const current = readWorksheet(worksheet);
  if (typeof query !== 'string' || query.length > 80 || /[\u0000-\u001f\u007f\u0085\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/.test(query)) throw Error('Invalid search');
  const needle = query.trim().toLocaleLowerCase('en');
  return current.items.filter(item => (item.name + ' ' + item.id).toLocaleLowerCase('en').includes(needle));
}

/** Deterministic, offline JSON backup. No browser storage or network access. */
export function toJson(worksheet) {
  return JSON.stringify(readWorksheet(worksheet)) + '\n';
}

/** Restore only the exact versioned worksheet shape; never trust parsed totals. */
export function fromJson(text) {
  if (typeof text !== 'string' || text.length > 65536) throw Error('Invalid worksheet JSON');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw Error('Invalid worksheet JSON'); }
  return readWorksheet(parsed);
}
