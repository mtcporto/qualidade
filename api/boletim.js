import { collect } from '../lib/boletim.js';

export default async function handler(request, response) {
  try {
    const payload = await collect();
    response.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    response.status(200).json(payload);
  } catch (error) {
    response.status(502).json({ error: 'Não foi possível consultar as fontes neste momento.' });
  }
}
