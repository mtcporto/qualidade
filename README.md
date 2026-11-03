# Maré Clara · Balneabilidade na Paraíba

Plataforma independente de monitoramento da balneabilidade das praias da Paraíba com dados consolidados dos relatórios semanais da SUDEMA (Superintendência de Administração do Meio Ambiente) e apurações da imprensa local.

Inclui **Interface Web**, **API REST v1**, especificação **OpenAPI 3.1**, guia semântico **/llms.txt** e servidor **MCP (Model Context Protocol)** para agentes de inteligência artificial.

---

## 🌊 Recursos e Arquitetura

1. **Frontend Leve:** Interface web estática e rápida construída com HTML5 e CSS puro com suporte a temas modernos e responsividade.
2. **Coletor e Normalizador Inteligente:**
   - Extrai automaticamente os trechos impróprios reportados semanalmente pela SUDEMA e veículos de imprensa.
   - Normaliza municípios, nomes de praias e pontos de coleta ao longo do litoral paraibano.
3. **Persistência Híbrida:**
   - Suporte ao Turso (LibSQL Serverless Database).
   - Fallback gracioso local (`data.json`) quando executado offline ou sem credenciais remotas.
4. **API REST v1:** Endpoints JSON para consumo por terceiros e integrações.
5. **Servidor MCP (Streamable HTTP):** Conexão direta com assistentes como Cursor, Claude Desktop, Antigravity e agentes autônomos.

---

## 🤖 Servidor MCP (Model Context Protocol)

O servidor MCP expõe ferramentas estruturadas para agentes consultarem a qualidade da água antes de orientar os usuários.

- **URL do Servidor:** `https://qualidade-nine.vercel.app/mcp`
- **Transporte:** Streamable HTTP POST
- **Autenticação:** Pública (somente leitura)

### Ferramentas Disponíveis

| Ferramenta | Descrição | Parâmetros |
|---|---|---|
| `consultar_praia` | Verifica se uma praia específica possui trecho impróprio no boletim ativo, detalhando o ponto e orientações. | `praia` (string, obrigatório), `municipio` (string, opcional) |
| `listar_improprias` | Lista todos os trechos classificados como impróprios para banho no litoral paraibano. | `municipio` (string, opcional) |
| `boletim_atual` | Metadados do relatório vigente da SUDEMA: período da coleta, validade, pontos monitorados (~62) e fontes. | *Nenhum* |
| `listar_praias_monitoradas` | Catálogo de todos os municípios e praias monitoradas pelo órgão ambiental na Paraíba. | `municipio` (string, opcional) |

### Recurso MCP
- `qualidade://boletim`: Conteúdo completo do relatório de balneabilidade ativo em JSON.

### Como Configurar no Claude Desktop / Cursor

Adicione ao seu `claude_desktop_config.json` ou arquivo de configuração MCP do seu editor/agente:

```json
{
  "mcpServers": {
    "mare-clara": {
      "url": "https://qualidade-nine.vercel.app/mcp"
    }
  }
}
```

---

## 📡 Endpoints da API REST

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/v1/boletim` | Relatório completo de balneabilidade vigente, com metadados, trechos impróprios e links das fontes. |
| `GET` | `/api/v1/praias` | Catálogo de praias com status (Própria/Imprópria). Suporta `?municipio=...`, `?status=propria\|impropria` e busca textual `?q=...`. |
| `GET` | `/api/v1/openapi.json` | Especificação OpenAPI 3.1.0 completa das rotas da API. |
| `GET` | `/llms.txt` | Guia de contexto puro para LLMs, crawlers e agentes de IA. |
| `GET` | `/api-docs` | Página visual interativa com a documentação da API e do servidor MCP. |

---

## 📋 Regras de Domínio e Balneabilidade

1. **Regra dos 100 Metros da SUDEMA:** A classificação "imprópria" aplica-se exclusivamente a uma faixa de 100 metros à direita e 100 metros à esquerda do ponto de coleta indicado. Fora deste perímetro, o restante da praia permanece liberado para banho.
2. **Critério Própria vs. Imprópria:** A SUDEMA monitora cerca de 62 pontos distribuídos em 8 municípios (João Pessoa, Cabedelo, Lucena, Pitimbu, Conde, Mataraca, Baía da Traição e Rio Tinto). As praias que *não constam* na lista de trechos impróprios estão consideradas próprias pelo órgão ambiental.
3. **Ciclo de Atualização:** Novos relatórios são emitidos semanalmente (normalmente às sextas-feiras), com validade até a próxima emissão na sexta-feira seguinte.

---

## 💻 Desenvolvimento Local e Testes

Instale as dependências:

```bash
npm install
```

Execute a suíte de testes:

```bash
npm test
```

Execute a coleta manual das fontes:

```bash
npm run collect
```
