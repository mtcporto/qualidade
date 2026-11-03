import { getLatestBulletin, saveBulletin, tursoEnabled } from '../../lib/db.js';
import { collect, needsRefresh } from '../../lib/boletim.js';

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
    let payload = await getLatestBulletin();
    if (!payload || needsRefresh(payload)) {
      const collected = await collect();
      if (collected.current || !payload) {
        payload = collected;
        await saveBulletin(payload);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      success: true,
      meta: {
        orgao: 'SUDEMA - Superintendência de Administração do Meio Ambiente',
        gerado_em: payload.generated_at,
        periodo_coleta: payload.periodo,
        valido_ate: payload.validade,
        confianca: payload.confidence,
        vigente: payload.current,
        total_pontos_monitorados_sudema: 62,
        regra_distancia: 'A classificação de impróprio aplica-se exclusivamente a uma faixa de 100 metros à direita e 100 metros à esquerda do ponto de coleta.',
        armazenamento: tursoEnabled ? 'turso' : 'local_fallback',
        referencia_oficial: payload.official_reference,
      },
      total_trechos_improprios: (payload.records || []).length,
      trechos_improprios: payload.records || [],
      artigos_imprensa: payload.articles || [],
      fontes_status: payload.sources || [],
    });
  } catch (error) {
    console.error('Erro na rota /api/v1/boletim:', error);
    return res.status(502).json({
      success: false,
      error: 'Não foi possível consultar os dados de balneabilidade neste momento.',
    });
  }
}
