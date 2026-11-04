import "dotenv/config";

const airtableBaseUrl = "https://api.airtable.com/v0";

function airtableConfig() {
  const token = process.env.AIRTABLE_API_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_STUDENTS_TABLE;
  if (!token || !baseId || !tableId) {
    const error = new Error("Airtable configuration is incomplete");
    error.statusCode = 503;
    throw error;
  }
  return { token, baseId, tableId };
}

export async function fetchAllAirtableRecords(tableId = airtableConfig().tableId) {
  const { token, baseId } = airtableConfig();
  const records = [];
  let offset;
  do {
    const url = new URL(`${airtableBaseUrl}/${baseId}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Airtable request failed (${response.status}): ${body}`);
      error.statusCode = response.status === 401 || response.status === 403 ? 502 : 500;
      throw error;
    }
    const payload = await response.json();
    records.push(...(payload.records ?? []));
    offset = payload.offset;
  } while (offset);
  return records;
}

export function airtableField(fields, ...names) {
  for (const name of names) {
    const value = fields?.[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}
