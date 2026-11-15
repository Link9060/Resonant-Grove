/** Pure, offline inventory worksheet core. No persistence, network, or customer data. */
const validName = value => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80 && !/[<>\u0000-\u001f]/.test(value);
const validCount = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
export function createWorksheet(rows = []) {
  if (!Array.isArray(rows) || rows.length > 100) throw Error('Invalid inventory rows');
  const ids = new Set();
  const items = rows.map((row, index) => {
    if (!row || typeof row !== 'object' || !/^[a-z0-9-]{1,40}$/.test(row.id ?? '') || ids.has(row.id) || !validName(row.name) || !validCount(row.count)) throw Error('Invalid inventory row ' + index);
    ids.add(row.id);
    return {id: row.id, name: row.name.trim(), count: row.count};
  });
  return {schemaVersion: 1, items, total: items.reduce((sum, row) => sum + row.count, 0)};
}
export function setCount(worksheet, id, count) {
  if (!validCount(count)) throw Error('Invalid count');
  const current = createWorksheet(worksheet?.items);
  if (!current.items.some(row => row.id === id)) throw Error('Unknown item');
  return createWorksheet(current.items.map(row => row.id === id ? {...row, count} : row));
}
export function addItem(worksheet, item) {
  const current = createWorksheet(worksheet?.items);
  return createWorksheet([...current.items, item]);
}
