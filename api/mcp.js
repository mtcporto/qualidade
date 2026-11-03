import { mcpHandler } from '../lib/mcp.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Mcp-Method, Mcp-Name, Mcp-Client-Info, Mcp-Server-Info'
  );
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Protocol-Version, MCP-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Maré Clara · Servidor MCP</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
    h1 { color: #0284c7; }
    code { background: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    a { color: #0284c7; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Maré Clara · Endpoint MCP</h1>
  <p>Este é o endpoint <strong>Streamable HTTP</strong> do servidor Model Context Protocol (MCP) do Maré Clara, fornecendo balneabilidade das praias da Paraíba em tempo real.</p>
  <p>Para interagir como agente ou cliente MCP (Claude Desktop, Cursor, Antigravity, etc.), faça requisições <code>POST</code> com cabeçalho <code>Content-Type: application/json</code>.</p>
  <h3>Exemplo de Configuração para Clientes MCP</h3>
  <pre><code>{
  "mcpServers": {
    "mare-clara": {
      "url": "https://qualidade-nine.vercel.app/mcp"
    }
  }
}</code></pre>
  <p><a href="/api-docs">&larr; Voltar para a documentação completa da API & MCP</a></p>
</body>
</html>`);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET, OPTIONS');
    return res.status(405).json({ error: 'Use POST para o endpoint MCP.' });
  }

  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const url = `${proto}://${host}${req.url}`;

    let body = req.body;
    if (typeof body === 'object' && body !== null) {
      body = JSON.stringify(body);
    } else if (typeof body !== 'string') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks).toString('utf8');
    }

    const webReq = new Request(url, {
      method: 'POST',
      headers: req.headers,
      body: body || undefined,
    });

    const webRes = await mcpHandler.fetch(webReq);

    res.status(webRes.status);
    for (const [k, v] of webRes.headers.entries()) {
      res.setHeader(k, v);
    }

    const text = await webRes.text();
    return res.send(text);
  } catch (err) {
    console.error('MCP Handler error:', err);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: err.message || 'Erro interno no servidor MCP' },
      id: null,
    });
  }
}
