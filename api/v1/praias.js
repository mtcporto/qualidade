import { getLatestBulletin } from '../../lib/db.js';
import { BEACH_CATALOG, normalize } from '../../lib/boletim.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const bulletin = await getLatestBulletin();
    if (!bulletin) {
      return res.status(502).json({ error: 'Boletim temporariamente indisponível.' });
    }

    const { municipio, status, q } = req.query || {};
    const munFilter = municipio ? normalize(municipio) : null;
    const statusFilter = status ? normalize(status) : null;
    const qFilter = q ? normalize(q).replace(/^praia (do|da|de) /i, '').replace(/^praia /i, '') : null;

    const improperRecords = bulletin.records || [];
    const beachesList = [];

    for (const [mun, praias] of Object.entries(BEACH_CATALOG)) {
      if (munFilter && !normalize(mun).includes(munFilter)) {
        continue;
      }

      for (const praia of praias) {
        const normPraia = normalize(praia);
        if (qFilter && !normPraia.includes(qFilter) && !qFilter.includes(normPraia)) {
          continue;
        }

        const matches = improperRecords.filter((r) => {
          const rPraiaNorm = normalize(r.praia);
          const rMunNorm = normalize(r.municipio);
          const beachMatches = rPraiaNorm === normPraia || rPraiaNorm.includes(normPraia) || normPraia.includes(rPraiaNorm);
          const munMatches = rMunNorm === normalize(mun);
          return beachMatches && munMatches;
        });

        const isImpropria = matches.length > 0;
        const currentStatus = isImpropria ? 'impropria' : 'propria';

        if (statusFilter && statusFilter !== currentStatus) {
          continue;
        }

        beachesList.push({
          praia,
          municipio: mun,
          status: isImpropria ? 'Imprópria' : 'Própria',
          qualidade: isImpropria ? 'Imprópria' : 'Própria',
          trechos_improprios: matches.map((m) => ({
            ponto: m.ponto,
            raio_restricao: '100 metros à direita e 100 metros à esquerda do ponto de coleta',
            fontes: m.sources,
            confianca: m.confidence,
          })),
        });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      success: true,
      periodo: bulletin.periodo,
      validade: bulletin.validade,
      total: beachesList.length,
      filtros: {
        municipio: municipio || null,
        status: status || null,
        q: q || null,
      },
      praias: beachesList,
    });
  } catch (error) {
    console.error('Erro na rota /api/v1/praias:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar catálogo de praias.' });
  }
}
