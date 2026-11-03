import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getLatestBulletin } from './db.js';
import { BEACH_CATALOG, normalize } from './boletim.js';

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const output = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: data,
});

function findMonitoredBeach(praiaSearch, municipioSearch = '') {
  const normSearch = normalize(praiaSearch).replace(/^praia (do|da|de) /i, '').replace(/^praia /i, '');
  const normMun = municipioSearch ? normalize(municipioSearch) : '';

  for (const [municipio, praias] of Object.entries(BEACH_CATALOG)) {
    if (normMun && normalize(municipio) !== normMun && !normalize(municipio).includes(normMun)) {
      continue;
    }
    for (const praia of praias) {
      const normPraia = normalize(praia);
      if (normPraia === normSearch || normPraia.includes(normSearch) || normSearch.includes(normPraia)) {
        return { praia, municipio };
      }
    }
  }
  return null;
}

export function createMareClaraMcp() {
  const server = new McpServer(
    { name: 'mare-clara', version: '1.0.0' },
    {
      instructions:
        'Dados de balneabilidade das praias do litoral da Paraíba monitoradas pela SUDEMA e apuradas pela imprensa local. ' +
        'A classificação de imprópria para banho se aplica exclusivamente a uma faixa de 100 metros à direita e 100 metros à esquerda de cada ponto de coleta. ' +
        'As praias que NÃO constam na lista de trechos impróprios estão consideradas PRÓPRIAS/LIBERADAS para banho pelo órgão ambiental dentro dos 62 pontos monitorados. ' +
        'Boletins são semanais (emitidos geralmente às sextas-feiras).'
    }
  );

  // Tool 1: Consultar praia específica
  server.registerTool(
    'consultar_praia',
    {
      title: 'Consultar Balneabilidade da Praia',
      description:
        'Verifica se uma praia específica da Paraíba possui trecho impróprio para banho no boletim vigente, detalhando os pontos de coleta e a regra dos 100 metros.',
      inputSchema: z.object({
        praia: z.string().min(2).max(100).describe('Nome da praia (ex: "Tambaú", "Cabo Branco", "Manaíra", "Seixas", "Jacarapé", "Intermares", "Maceió")'),
        municipio: z.string().max(100).optional().describe('Município opcional (ex: "João Pessoa", "Cabedelo", "Pitimbu", "Conde", "Lucena")'),
      }),
      annotations,
    },
    async ({ praia, municipio }) => {
      const bulletin = await getLatestBulletin();
      if (!bulletin) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Boletim de balneabilidade temporariamente indisponível.' }],
        };
      }

      const monitored = findMonitoredBeach(praia, municipio);
      const searchNorm = normalize(praia).replace(/^praia (do|da|de) /i, '').replace(/^praia /i, '');
      const munNorm = municipio ? normalize(municipio) : '';

      const matchedRecords = (bulletin.records || []).filter((r) => {
        const rPraiaNorm = normalize(r.praia);
        const rMunNorm = normalize(r.municipio);
        const beachMatches = rPraiaNorm === searchNorm || rPraiaNorm.includes(searchNorm) || searchNorm.includes(rPraiaNorm);
        const munMatches = !munNorm || rMunNorm === munNorm || rMunNorm.includes(munNorm);
        return beachMatches && munMatches;
      });

      const hasImproperSpots = matchedRecords.length > 0;
      const statusGeral = hasImproperSpots ? 'Atenção: Trecho Impróprio' : 'Própria / Liberada';

      const response = {
        praia: monitored ? monitored.praia : praia,
        municipio: monitored ? monitored.municipio : (municipio || 'Litoral Paraibano'),
        monitorada_pela_sudema: Boolean(monitored),
        status: statusGeral,
        qualidade: hasImproperSpots ? 'Imprópria' : 'Própria',
        trechos_improprios: matchedRecords.map((r) => ({
          ponto: r.ponto,
          qualidade: r.qualidade,
          raio_restricao: '100 metros à direita e 100 metros à esquerda do ponto de coleta',
          confianca: r.confidence,
          fontes: r.sources,
        })),
        recomendacao: hasImproperSpots
          ? 'Evite o banho de mar em um raio de 100 metros ao redor do ponto indicado. Os demais trechos da praia estão liberados.'
          : 'Nenhum ponto desta praia consta como impróprio no boletim oficial da SUDEMA vigente.',
        boletim: {
          periodo: bulletin.periodo,
          validade: bulletin.validade,
          referencia_oficial: bulletin.official_reference,
        },
      };

      return output(response);
    }
  );

  // Tool 2: Listar trechos impróprios
  server.registerTool(
    'listar_improprias',
    {
      title: 'Listar Praias e Trechos Impróprios',
      description:
        'Lista todos os trechos classificados como impróprios para banho no litoral da Paraíba no relatório mais recente da SUDEMA, com filtro opcional por município.',
      inputSchema: z.object({
        municipio: z.string().max(100).optional().describe('Filtrar por município (ex: "João Pessoa", "Pitimbu", "Cabedelo", "Conde", "Lucena")'),
      }),
      annotations,
    },
    async ({ municipio }) => {
      const bulletin = await getLatestBulletin();
      if (!bulletin) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Boletim de balneabilidade temporariamente indisponível.' }],
        };
      }

      const munNorm = municipio ? normalize(municipio) : '';
      const filteredRecords = (bulletin.records || []).filter((r) => {
        if (!munNorm) return true;
        const rMunNorm = normalize(r.municipio);
        return rMunNorm === munNorm || rMunNorm.includes(munNorm);
      });

      return output({
        municipio: municipio || 'Todos os municípios monitorados',
        total_improprios: filteredRecords.length,
        periodo: bulletin.periodo,
        validade: bulletin.validade,
        regra: 'A classificação imprópria se aplica a uma faixa de 100 metros à direita e à esquerda do ponto de coleta.',
        trechos: filteredRecords.map((r) => ({
          municipio: r.municipio,
          praia: r.praia,
          ponto: r.ponto,
          qualidade: r.qualidade,
          fontes: r.sources,
        })),
        aviso: filteredRecords.length === 0
          ? 'Nenhum trecho impróprio encontrado para este filtro no boletim vigente. As praias monitoradas estão próprias para banho.'
          : undefined,
      });
    }
  );

  // Tool 3: Boletim consolidado atual
  server.registerTool(
    'boletim_atual',
    {
      title: 'Boletim Oficial Vigente',
      description:
        'Visão geral do relatório de balneabilidade ativo da SUDEMA: datas de coleta e validade, total de trechos impróprios, pontos monitorados e fontes oficiais.',
      inputSchema: z.object({}),
      annotations,
    },
    async () => {
      const bulletin = await getLatestBulletin();
      if (!bulletin) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Boletim de balneabilidade temporariamente indisponível.' }],
        };
      }

      return output({
        periodo_coleta: bulletin.periodo,
        valido_ate: bulletin.validade,
        confianca: bulletin.confidence,
        vigente: bulletin.current,
        total_trechos_improprios: (bulletin.records || []).length,
        total_pontos_monitorados_sudema: 62,
        municipios_cobertos: Object.keys(BEACH_CATALOG),
        trechos_improprios: bulletin.records || [],
        artigos_fontes: (bulletin.articles || []).map((a) => ({
          fonte: a.source,
          titulo: a.title,
          url: a.url,
        })),
        referencia_oficial: bulletin.official_reference,
        nota_tecnica:
          'A SUDEMA monitora 62 pontos em 8 municípios litorâneos da Paraíba. ' +
          'Apenas os trechos em um raio de 100m do ponto impróprio devem ser evitados; as demais praias permanecem liberadas.',
      });
    }
  );

  // Tool 4: Catálogo de praias monitoradas
  server.registerTool(
    'listar_praias_monitoradas',
    {
      title: 'Catálogo de Praias Monitoradas',
      description:
        'Lista os municípios e praias do litoral paraibano acompanhados no monitoramento oficial da SUDEMA.',
      inputSchema: z.object({
        municipio: z.string().max(100).optional().describe('Filtrar praias por município'),
      }),
      annotations,
    },
    async ({ municipio }) => {
      const munNorm = municipio ? normalize(municipio) : '';
      const catalog = {};

      for (const [mun, praias] of Object.entries(BEACH_CATALOG)) {
        if (!munNorm || normalize(mun).includes(munNorm)) {
          catalog[mun] = praias;
        }
      }

      return output({
        municipios_encontrados: Object.keys(catalog).length,
        catalogo: catalog,
        orgao_responsavel: 'SUDEMA - Superintendência de Administração do Meio Ambiente',
      });
    }
  );

  // Resource: qualidade://boletim
  server.registerResource(
    'boletim-vigente',
    'qualidade://boletim',
    {
      title: 'Boletim de Balneabilidade Vigente',
      mimeType: 'application/json',
      description: 'Dados completos do relatório atual de balneabilidade na Paraíba.',
    },
    async (uri) => {
      const bulletin = await getLatestBulletin();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(bulletin, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

export const mcpHandler = createMcpHandler(createMareClaraMcp, {
  legacy: 'stateless',
  responseMode: 'json',
  maxRequestBodySize: 32768,
});
