import { createClient } from '@libsql/client/web';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.TURSO_DATABASE_URL || process.env.turso_url;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.turso_token;
export const tursoEnabled = Boolean(url && authToken);
const client = tursoEnabled ? createClient({ url, authToken }) : null;
let schemaReady;

function getFallbackData() {
  try {
    const dataPath = path.resolve(process.cwd(), 'data.json');
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch {}
  return null;
}

async function ensureSchema() {
  if (!tursoEnabled) return;
  schemaReady ||= client.execute(`CREATE TABLE IF NOT EXISTS bulletins (
    id TEXT PRIMARY KEY,
    generated_at TEXT NOT NULL,
    period TEXT,
    valid_until TEXT,
    confidence TEXT NOT NULL,
    payload TEXT NOT NULL
  )`);
  await schemaReady;
}

export async function getLatestBulletin() {
  if (tursoEnabled) {
    try {
      await ensureSchema();
      const result = await client.execute('SELECT payload FROM bulletins ORDER BY generated_at DESC LIMIT 1');
      if (result.rows[0]?.payload) {
        return JSON.parse(result.rows[0].payload);
      }
    } catch (e) {
      console.warn('Falha ao consultar Turso, usando dados locais:', e.message);
    }
  }
  return getFallbackData();
}

export async function saveBulletin(payload) {
  if (!tursoEnabled) return false;
  await ensureSchema();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO bulletins (id, generated_at, period, valid_until, confidence, payload) VALUES (?, ?, ?, ?, ?, ?)',
    args: [payload.generated_at, payload.generated_at, payload.periodo || null, payload.validade || null, payload.confidence || 'revisar', JSON.stringify(payload)],
  });
  return true;
}
