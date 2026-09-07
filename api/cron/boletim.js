import { collect } from '../../lib/boletim.js';

export default async function handler(request, response) {
  if (request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).send('Unauthorized');
  }
  const payload = await collect();
  response.status(200).json({ ok: true, confidence: payload.confidence, records: payload.records.length });
}
