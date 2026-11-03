export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Maré Clara API',
      version: '1.0.0',
      description:
        'API pública de balneabilidade das praias do litoral da Paraíba, baseada nos relatórios oficiais da SUDEMA e fontes de imprensa. ' +
        'Inclui endpoint Streamable HTTP MCP em /mcp para agentes de inteligência artificial.',
      contact: {
        name: 'Maré Clara',
        url: 'https://qualidade-nine.vercel.app',
      },
    },
    servers: [
      {
        url: 'https://qualidade-nine.vercel.app',
        description: 'Servidor de Produção (Vercel)',
      },
    ],
    paths: {
      '/api/v1/boletim': {
        get: {
          summary: 'Boletim Vigente de Balneabilidade',
          description:
            'Retorna o relatório oficial completo de balneabilidade, com período de coleta, data de validade, trechos impróprios e referências.',
          responses: {
            '200': {
              description: 'Boletim vigente retornado com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      meta: { type: 'object' },
                      total_trechos_improprios: { type: 'integer' },
                      trechos_improprios: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/praias': {
        get: {
          summary: 'Catálogo de Praias e Status',
          description:
            'Consulta as praias monitoradas na Paraíba e seus respectivos status (Própria / Imprópria), com filtros por município e status.',
          parameters: [
            {
              name: 'municipio',
              in: 'query',
              required: false,
              description: 'Filtrar por município (ex: João Pessoa, Cabedelo, Pitimbu)',
              schema: { type: 'string' },
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              description: 'Filtrar por status: propria ou impropria',
              schema: { type: 'string', enum: ['propria', 'impropria'] },
            },
            {
              name: 'q',
              in: 'query',
              required: false,
              description: 'Busca por termo no nome da praia',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de praias filtradas.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      total: { type: 'integer' },
                      praias: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/mcp': {
        post: {
          summary: 'Endpoint MCP (Model Context Protocol)',
          description:
            'Servidor MCP Streamable HTTP compatível com Claude Desktop, Cursor, Antigravity e agentes autônomos. ' +
            'Permite ferramentas como consultar_praia, listar_improprias, boletim_atual e listar_praias_monitoradas.',
          responses: {
            '200': {
              description: 'Resposta do protocolo MCP (JSON-RPC 2.0).',
            },
          },
        },
      },
      '/llms.txt': {
        get: {
          summary: 'Guia de Contexto para LLMs',
          description: 'Documentação semântica pura em formato texto para agentes de IA e crawlers.',
          responses: {
            '200': {
              description: 'Arquivo de instruções de domínio em texto puro.',
              content: {
                'text/plain': {},
              },
            },
          },
        },
      },
    },
  };

  return res.status(200).json(spec);
}
