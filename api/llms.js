export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const content = `# Maré Clara · Balneabilidade das Praias da Paraíba

> Dados oficiais de balneabilidade das praias da Paraíba monitoradas pela SUDEMA (Superintendência de Administração do Meio Ambiente) e reportadas pela imprensa local.

## Consultas para Agentes de IA

### 1. Endpoint MCP (Model Context Protocol)
- **URL do Servidor MCP:** https://qualidade-nine.vercel.app/mcp
- **Transporte:** Streamable HTTP POST
- **Sem autenticação necessária** (Somente leitura pública)
- **Ferramentas Registradas:**
  - \`consultar_praia(praia, municipio?)\`: Verifica se uma praia específica está própria ou imprópria, detalhando o ponto exato da coleta e orientações.
  - \`listar_improprias(municipio?)\`: Lista todos os trechos impróprios ativos na Paraíba (ou filtrados por município).
  - \`boletim_atual()\`: Metadados do boletim vigente (período de coleta, validade até a próxima sexta, total de pontos monitorados e fontes).
  - \`listar_praias_monitoradas(municipio?)\`: Catálogo oficial de praias e municípios monitorados pela SUDEMA.
- **Recursos Registrados:**
  - \`qualidade://boletim\`: JSON consolidado do relatório atual.

### 2. REST API v1
- Documentação interativa: https://qualidade-nine.vercel.app/api-docs
- OpenAPI JSON: https://qualidade-nine.vercel.app/api/v1/openapi.json
- Boletim Completo JSON: https://qualidade-nine.vercel.app/api/v1/boletim
- Catálogo de Praias JSON: https://qualidade-nine.vercel.app/api/v1/praias

## Regras de Domínio e Como Interpretar os Dados

1. **Regra dos 100 Metros da SUDEMA:** A classificação "imprópria" aplica-se exclusivamente a uma faixa de 100 metros à direita e 100 metros à esquerda do ponto de coleta indicado. Fora deste perímetro, o restante da praia é considerado liberado para banho.
2. **Critério Própria vs. Imprópria:** A SUDEMA monitora 62 pontos em 8 municípios (João Pessoa, Cabedelo, Lucena, Pitimbu, Conde, Mataraca, Baía da Traição e Rio Tinto). As praias que NÃO constam na lista de trechos impróprios estão consideradas PRÓPRIAS para banho.
3. **Ciclo de Atualização:** Os relatórios são emitidos semanalmente (normalmente às sextas-feiras), com validade até a divulgação do próximo relatório na sexta-feira seguinte.
4. **Fuso Horário:** Horário oficial de Brasília (America/Fortaleza, UTC-03:00).
5. **Fonte Primária:** https://sudema.pb.gov.br/qualidade-do-ambiente/qualidade-dos-mares
`;

  return res.status(200).send(content);
}
