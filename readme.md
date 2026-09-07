# Maré Clara

Painel simples para acompanhar a balneabilidade do litoral da Paraíba.

## Situação atual

O coletor antigo dependia do HTML da página da SUDEMA e do endpoint `mtcporto2.pythonanywhere.com`. A SUDEMA passou a publicar o boletim em PDF e o endpoint legado atualmente retorna uma página “Coming Soon”, por isso a interface agora trata a indisponibilidade explicitamente e não mostra números inventados.

## Fontes usadas

A primeira versão consulta Jornal da Paraíba, F5 Online e Repórter PB. RSS e páginas de busca são detalhes internos da coleta; o usuário vê apenas as matérias efetivamente usadas no boletim. A SUDEMA permanece como referência oficial para conferência humana e não é lida automaticamente.

O coletor usa RSS quando a matéria está no feed e busca HTML como fallback. Depois baixa a matéria, extrai período/validade e trechos impróprios, e salva o último boletim normalizado em JSON. Assim o navegador não depende de CORS nem de um proxy público.

## Primeira versão do coletor

`collector.py` consulta semanalmente Jornal da Paraíba, F5 Online e Repórter PB. Ele encontra matérias recentes no RSS, baixa o HTML, extrai trechos impróprios e grava `data.json`. Cada trecho recebe confiança `alta` quando aparece em pelo menos duas fontes; caso contrário, fica marcado como `revisar`. A SUDEMA é mantida no JSON somente como referência oficial, com `official_reference_automated: false`.

Para executar:

```bash
pip install -r requirements.txt
python3 collector.py --output data.json
```

O painel tenta ler `data.json` antes do endpoint antigo. Recomenda-se executar o coletor uma vez na sexta-feira de manhã e publicar o JSON somente após conferir divergências.

## Rodar localmente

Como o projeto é estático, qualquer servidor HTTP simples funciona:

```bash
python3 -m http.server 8080
```

Depois, abra `http://localhost:8080`.
