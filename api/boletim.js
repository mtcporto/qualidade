import { collect } from '../lib/boletim.js';
import { getLatestBulletin, saveBulletin, tursoEnabled } from '../lib/db.js';

export default async function handler(request, response) {
  try {
    let payload = await getLatestBulletin();
    if (!payload) {
      payload = await collect();
      await saveBulletin(payload);
    }
    response.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    response.status(200).json({ ...payload, storage: tursoEnabled ? 'turso' : 'fallback' });
  } catch (error) {
    response.status(502).json({ error: 'Não foi possível consultar as fontes neste momento.' });
  }
}
