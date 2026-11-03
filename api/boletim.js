import { collect, needsRefresh } from '../lib/boletim.js';
import { getLatestBulletin, saveBulletin, tursoEnabled } from '../lib/db.js';

export default async function handler(request, response) {
  try {
    const forceRefresh = request.query?.refresh === 'true';
    let payload = await getLatestBulletin();
    const shouldRefresh = forceRefresh || !payload || needsRefresh(payload) || (payload.records?.length === 0 && payload.confidence === 'revisar');

    if (shouldRefresh) {
      const collected = await collect();
      if (collected.current || !payload) {
        payload = collected;
        await saveBulletin(payload);
      }
    }
    response.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    response.status(200).json({ ...payload, storage: tursoEnabled ? 'turso' : 'fallback' });
  } catch (error) {
    response.status(502).json({ error: 'Não foi possível consultar as fontes neste momento.' });
  }
}
