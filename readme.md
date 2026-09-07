# Maré Clara

Painel simples para acompanhar a balneabilidade do litoral da Paraíba.

## Situação atual

O coletor antigo dependia do HTML da página da SUDEMA e do endpoint `mtcporto2.pythonanywhere.com`. A SUDEMA passou a publicar o boletim em PDF e o endpoint legado atualmente retorna uma página “Coming Soon”, por isso a interface agora trata a indisponibilidade explicitamente e não mostra números inventados.

## Fontes usadas

A primeira versão consulta Jornal da Paraíba, F5 Online e Repórter PB. RSS e páginas de busca são detalhes internos da coleta; o usuário vê apenas as matérias efetivamente usadas no boletim. A SUDEMA permanece como referência oficial para conferência humana e não é lida automaticamente.

O coletor usa RSS quando a matéria está no feed e busca HTML como fallback. Depois baixa a matéria, extrai período/validade e trechos impróprios, e salva o último boletim normalizado em JSON. Assim o navegador não depende de CORS nem de um proxy público.

## Primeira versão do coletor

`lib/boletim.js` é usado pela Vercel Function `api/boletim.js`. A função consulta semanalmente Jornal da Paraíba, F5 Online e Repórter PB, encontra matérias recentes no RSS ou na busca HTML, extrai os trechos impróprios e devolve um JSON normalizado. Cada trecho recebe confiança `alta` quando aparece em pelo menos duas fontes; caso contrário, fica marcado como `revisar`. A SUDEMA é mantida no JSON somente como referência oficial, com `official_reference_automated: false`.

O cron da Vercel chama `/api/cron/boletim` às sextas-feiras, às 8h no horário da Paraíba (`11:00 UTC`). É necessário configurar `CRON_SECRET` no projeto. A função usa cache por algumas horas, e `data.json` permanece como fallback para quando as fontes estiverem indisponíveis.

Quando configurado, o cron grava cada snapshot na tabela `bulletins` do Turso. A rota `/api/boletim` lê o último snapshot do banco e só faz uma coleta nova se ainda não houver dados armazenados.

## Variáveis de ambiente

Os nomes padronizados para este projeto são:

```text
CRON_SECRET
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

Use `.env.example` como modelo. O arquivo `.env` local não é versionado.

## Rodar localmente

Como o projeto é estático, qualquer servidor HTTP simples funciona:

```bash
python3 -m http.server 8080
```

Depois, abra `http://localhost:8080`.
