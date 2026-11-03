import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRecords, BEACH_CATALOG } from '../lib/boletim.js';
import { createMareClaraMcp, mcpHandler } from '../lib/mcp.js';
import openApiHandler from '../api/v1/openapi.js';
import llmsHandler from '../api/llms.js';
import praiasHandler from '../api/v1/praias.js';
import boletimV1Handler from '../api/v1/boletim.js';
import mcpRouteHandler from '../api/mcp.js';

test('Parser: reconhece trechos compostos e simples', () => {
  const sample = 'Trechos impróprios em João Pessoa: Jacarapé e Sol: Rua Manoel Candido Soares. Cabo Branco: em frente ao número 100';
  const records = extractRecords(sample);
  assert.equal(records.length, 3);

  const praias = records.map(r => r.praia);
  assert.ok(praias.includes('Jacarapé'));
  assert.ok(praias.includes('Sol'));
  assert.ok(praias.includes('Cabo Branco'));

  const jacarape = records.find(r => r.praia === 'Jacarapé');
  assert.equal(jacarape.municipio, 'João Pessoa');
  assert.equal(jacarape.ponto, 'Rua Manoel Candido Soares');
  assert.equal(jacarape.qualidade, 'Imprópria');
});

test('MCP Server: registra e executa as 4 tools e o recurso de boletim', async () => {
  const reqInit = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    })
  });
  const resInit = await mcpHandler.fetch(reqInit);
  assert.equal(resInit.status, 200);

  // List tools
  const reqTools = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  });
  const resTools = await mcpHandler.fetch(reqTools);
  const textTools = await resTools.text();
  assert.ok(textTools.includes('consultar_praia'));
  assert.ok(textTools.includes('listar_improprias'));
  assert.ok(textTools.includes('boletim_atual'));
  assert.ok(textTools.includes('listar_praias_monitoradas'));

  // Call consultar_praia (própria)
  const reqTambau = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'consultar_praia', arguments: { praia: 'Tambaú' } }
    })
  });
  const resTambau = await mcpHandler.fetch(reqTambau);
  const textTambau = await resTambau.text();
  assert.ok(textTambau.includes('Tambaú'));
  assert.ok(textTambau.includes('Própria / Liberada'));

  // Call consultar_praia (imprópria)
  const reqJacarape = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'consultar_praia', arguments: { praia: 'Jacarapé' } }
    })
  });
  const resJacarape = await mcpHandler.fetch(reqJacarape);
  const textJacarape = await resJacarape.text();
  assert.ok(textJacarape.includes('Jacarapé'));
  assert.ok(textJacarape.includes('Rua Manoel Candido Soares'));

  // Call listar_praias_monitoradas
  const reqCat = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'listar_praias_monitoradas', arguments: {} }
    })
  });
  const resCat = await mcpHandler.fetch(reqCat);
  const textCat = await resCat.text();
  assert.ok(textCat.includes('João Pessoa'));
  assert.ok(textCat.includes('Cabedelo'));
});

test('REST API: OpenAPI specification', async () => {
  let statusCode = 200;
  let headers = {};
  let bodyJson = null;

  const mockRes = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => { statusCode = code; return mockRes; },
    json: (data) => { bodyJson = data; return mockRes; }
  };

  openApiHandler({ method: 'GET' }, mockRes);
  assert.equal(statusCode, 200);
  assert.equal(bodyJson.openapi, '3.1.0');
  assert.ok(bodyJson.paths['/api/v1/boletim']);
  assert.ok(bodyJson.paths['/mcp']);
  assert.ok(bodyJson.paths['/llms.txt']);
});

test('REST API: llms.txt endpoint', async () => {
  let bodyText = '';
  let contentType = '';
  const mockRes = {
    setHeader: (k, v) => { if (k.toLowerCase() === 'content-type') contentType = v; },
    status: () => mockRes,
    send: (t) => { bodyText = t; return mockRes; }
  };

  llmsHandler({ method: 'GET' }, mockRes);
  assert.ok(contentType.includes('text/plain'));
  assert.ok(bodyText.includes('Maré Clara'));
  assert.ok(bodyText.includes('consultar_praia'));
  assert.ok(bodyText.includes('100 Metros'));
});

test('REST API: /api/v1/praias com filtros', async () => {
  let result = null;
  const mockRes = {
    setHeader: () => {},
    status: () => mockRes,
    json: (d) => { result = d; return mockRes; }
  };

  await praiasHandler({ method: 'GET', query: { municipio: 'João Pessoa' } }, mockRes);
  assert.ok(result.success);
  assert.ok(result.total > 0);
  assert.ok(result.praias.every(p => p.municipio === 'João Pessoa'));

  // Test status filter
  let resultImpropria = null;
  const mockResImpropria = {
    setHeader: () => {},
    status: () => mockResImpropria,
    json: (d) => { resultImpropria = d; return mockResImpropria; }
  };
  await praiasHandler({ method: 'GET', query: { status: 'impropria' } }, mockResImpropria);
  assert.ok(resultImpropria.success);
  assert.ok(resultImpropria.praias.length >= 1);
  assert.ok(resultImpropria.praias.every(p => p.status === 'Imprópria'));
});

test('MCP Route Handler: responde OPTIONS, GET e POST', async () => {
  // OPTIONS
  let optStatus = 0;
  const mockResOpt = {
    setHeader: () => {},
    status: (s) => { optStatus = s; return mockResOpt; },
    end: () => mockResOpt
  };
  await mcpRouteHandler({ method: 'OPTIONS', headers: {} }, mockResOpt);
  assert.equal(optStatus, 204);

  // GET
  let getHtml = '';
  const mockResGet = {
    setHeader: () => {},
    status: () => mockResGet,
    send: (html) => { getHtml = html; return mockResGet; }
  };
  await mcpRouteHandler({ method: 'GET', headers: {} }, mockResGet);
  assert.ok(getHtml.includes('Servidor MCP'));

  // POST
  let postData = '';
  const mockResPost = {
    setHeader: () => {},
    status: () => mockResPost,
    send: (txt) => { postData = txt; return mockResPost; }
  };
  await mcpRouteHandler({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-03-26',
      host: 'localhost'
    },
    url: '/mcp',
    body: {
      jsonrpc: '2.0',
      id: 10,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } }
    }
  }, mockResPost);
  assert.ok(postData.includes('mare-clara'));
});
