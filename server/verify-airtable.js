import 'dotenv/config';

const baseId = (process.env.AIRTABLE_BASE_ID || '').trim();
const tableId = (process.env.AIRTABLE_STUDENTS_TABLE || '').trim();
const token = (process.env.AIRTABLE_API_TOKEN || '').trim();

async function verifyAirtableConnection() {
  if (!baseId || !tableId || !token || token === 'PASTE_YOUR_AIRTABLE_TOKEN_HERE') {
    console.log(
      JSON.stringify({
        authenticated: false,
        tableAccessible: false,
        reason: 'AIRTABLE_API_TOKEN is missing or still set to the placeholder value in .env',
        baseIdConfigured: baseId === 'appkx6EobFEi9GNV9',
        studentsTableConfigured: tableId === 'tblu1valgGsqlXkrX',
      }),
    );
    process.exitCode = 1;
    return;
  }

  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('pageSize', '1');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      let errorType = `HTTP_${response.status}`;
      try {
        const errJson = await response.json();
        errorType = errJson?.error?.type || errJson?.error || errorType;
      } catch {
        // Ignore body parse errors to avoid logging raw response text
      }
      console.log(
        JSON.stringify({
          authenticated: response.status !== 401,
          tableAccessible: false,
          httpStatus: response.status,
          errorType,
          baseId,
          tableId,
        }),
      );
      process.exitCode = 1;
      return;
    }

    const payload = await response.json();
    const hasRecordsArray = Array.isArray(payload?.records);
    console.log(
      JSON.stringify({
        authenticated: true,
        tableAccessible: hasRecordsArray,
        httpStatus: response.status,
        baseId,
        tableId,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        authenticated: false,
        tableAccessible: false,
        errorType: error?.name || 'NETWORK_ERROR',
        message: error?.message || 'Request failed or timed out',
      }),
    );
    process.exitCode = 1;
  }
}

await verifyAirtableConnection();

