import { collect } from '../../lib/boletim.js';
import { saveBulletin, tursoEnabled } from '../../lib/db.js';

export default async function handler(request, response) {
  if (request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).send('Unauthorized');
  }
  const payload = await collect();
  await saveBulletin(payload);
  response.status(200).json({ ok: true, storage: tursoEnabled ? 'turso' : 'fallback', confidence: payload.confidence, records: payload.records.length });
}
