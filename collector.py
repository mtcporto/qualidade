#!/usr/bin/env python3
"""Coleta semanal de matérias sobre balneabilidade.

A SUDEMA não é consultada automaticamente. Os portais jornalísticos são usados
para descoberta e validação; a confirmação oficial continua sendo humana.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

import feedparser
from bs4 import BeautifulSoup

SOURCES = {
    "Jornal da Paraíba": {"feed": "https://jornaldaparaiba.com.br/rss", "host": "jornaldaparaiba.com.br"},
    "F5 Online": {"feed": "https://f5online.com.br/feed/", "search": "https://f5online.com.br/?s=balneabilidade", "host": "f5online.com.br"},
    "Repórter PB": {"feed": "https://www.reporterpb.com.br/rss", "search": "https://www.reporterpb.com.br/?s=balneabilidade", "host": "reporterpb.com.br"},
}
KEYWORDS = ("balneabilidade", "praias impróprias", "praias improprias", "impróprios para banho", "improprios para banho")
BEACH_MUNICIPALITY = {
    "manaíra": "João Pessoa", "penha": "João Pessoa", "cabo branco": "João Pessoa", "tambaú": "João Pessoa",
    "seixas": "João Pessoa", "jacarapé": "João Pessoa", "arraial": "João Pessoa", "praia do sol": "João Pessoa",
    "maceió": "Pitimbu", "guarita": "Pitimbu", "acaú": "Pitimbu", "pontinha": "Pitimbu", "coqueiros": "Pitimbu",
}


def fetch(url: str) -> str:
    request = Request(url, headers={"User-Agent": "VivaJoaoPessoa/1.0 (balneabilidade; contato no repositorio)"})
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def plain(value: str) -> str:
    value = html.unescape(re.sub(r"\s+", " ", value or "")).strip(" -–—•\t")
    return value


def key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


BEACH_MUNICIPALITY = {key(name): municipality for name, municipality in BEACH_MUNICIPALITY.items()}


def article_text(page: str) -> str:
    soup = BeautifulSoup(page, "html.parser")
    for element in soup(["script", "style", "noscript", "nav", "footer", "header", "aside"]):
        element.decompose()
    main = soup.find("article") or soup.find("main") or soup.body or soup
    return "\n".join(plain(line) for line in main.get_text("\n").splitlines() if plain(line))


def find_metadata(text: str) -> tuple[str | None, str | None]:
    period = None
    valid = None
    period_patterns = [
        r"(?:coletas?|amostras?|amostragem)[^\n.]{0,100}?(?:entre|de)\s+(\d{1,2}\s+\w+\s+a\s+\d{1,2}\s+\w+)",
        r"(?:entre|de)\s+(\d{1,2}\s+de\s+\w+\s+a\s+\d{1,2}\s+de\s+\w+)\s*,?\s*(?:e|;)?\s*(?:o relatório|a análise)",
        r"(?:período|periodo)[^\n.]{0,50}?(\d{1,2}\s+de\s+\w+\s+a\s+\d{1,2}\s+de\s+\w+)",
    ]
    valid_patterns = [
        r"(?:válid[oa]|validade)[^\n.]{0,80}?(?:até|dia)\s+(?:a próxima sexta-feira \()?([0-9]{1,2}(?:\s+de\s+\w+)?(?:\s*\)?))",
        r"(?:até|na data de)\s+(?:a próxima sexta-feira \()?([0-9]{1,2}\s+de\s+\w+)",
    ]
    for pattern in period_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            period = plain(match.group(1))
            break
    for pattern in valid_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            valid = plain(match.group(1))
            break
    return period, valid


def extract_records(text: str, source: str) -> list[dict]:
    records = []
    current_municipality = None
    lines = [plain(line) for line in text.splitlines() if plain(line)]
    for line in lines:
        normalized = key(line).replace("joao pessoa", "joao pessoa").replace("pitimbu", "pitimbu")
        if normalized in {"joao pessoa", "pitimbu", "pitimbu pb"}:
            current_municipality = "João Pessoa" if normalized == "joao pessoa" else "Pitimbu"
            continue
        match = re.match(r"^([^:]{2,70}):\s*(.{3,160})$", line)
        if not match:
            continue
        beach, point = plain(match.group(1)), plain(match.group(2))
        beach_key = key(beach)
        municipality = current_municipality or BEACH_MUNICIPALITY.get(beach_key)
        if not municipality or beach_key not in BEACH_MUNICIPALITY:
            continue
        if any(word in key(point) for word in ("propria", "liberada", "monitorad")):
            continue
        records.append({"municipio": municipality, "praia": beach, "ponto": point, "qualidade": "Imprópria", "source": source})
    unique = {(key(r["municipio"]), key(r["praia"]), key(r["ponto"])): r for r in records}
    return list(unique.values())


def discover() -> tuple[list[dict], list[dict]]:
    articles, source_status = [], []
    for name, config in SOURCES.items():
        try:
            feed = feedparser.parse(fetch(config["feed"]))
            matches = []
            for entry in feed.entries[:80]:
                haystack = key(f"{entry.get('title', '')} {entry.get('summary', '')}")
                if any(keyword in haystack for keyword in ("balneabilidade", "praias improprias", "improprios para banho")):
                    matches.append({"title": plain(entry.get("title", "")), "url": entry.get("link", ""), "published": entry.get("published", "")})
            if not matches and config.get("search"):
                search_soup = BeautifulSoup(fetch(config["search"]), "html.parser")
                seen = set()
                for anchor in search_soup.select("a[href]"):
                    title = plain(anchor.get_text(" ", strip=True))
                    url = urljoin(config["search"], anchor.get("href", ""))
                    if config["host"] not in url or url in seen or len(title) < 20:
                        continue
                    if any(term in key(f"{title} {url}") for term in ("balneabilidade", "praias improprios", "improprios para banho")):
                        matches.append({"title": title, "url": url, "published": ""})
                        seen.add(url)
            if matches:
                chosen = matches[0]
                text = article_text(fetch(chosen["url"]))
                period, valid = find_metadata(text)
                articles.append({"source": name, "title": chosen["title"], "url": chosen["url"], "published": chosen["published"], "periodo": period, "validade": valid, "records": extract_records(text, name)})
            source_status.append({"name": name, "found": bool(matches), "articles": len(matches), "error": None})
        except Exception as error:
            source_status.append({"name": name, "found": False, "articles": 0, "error": str(error)})
    return articles, source_status


def build_payload(articles: list[dict], source_status: list[dict]) -> dict:
    grouped = defaultdict(list)
    for article in articles:
        for record in article["records"]:
            grouped[(key(record["municipio"]), key(record["praia"]), key(record["ponto"]))].append(record)
    records = []
    for values in grouped.values():
        sources = sorted({item["source"] for item in values})
        record = dict(values[0])
        record["sources"] = sources
        record["confidence"] = "alta" if len(sources) >= 2 else "revisar"
        record.pop("source", None)
        records.append(record)
    periods = [article["periodo"] for article in articles if article.get("periodo")]
    validities = [article["validade"] for article in articles if article.get("validade")]
    consensus = sum(1 for record in records if record["confidence"] == "alta")
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "periodo": periods[0] if periods else None, "validade": validities[0] if validities else None, "confidence": "alta" if records and consensus == len(records) else "revisar", "records": records, "articles": articles, "sources": source_status, "official_reference": "https://sudema.pb.gov.br/qualidade-do-ambiente/relatorios-de-balneabilidade", "official_reference_automated": False}


def main() -> None:
    parser = argparse.ArgumentParser(description="Coleta e valida matérias de balneabilidade")
    parser.add_argument("--output", default="data.json", help="arquivo JSON de saída")
    args = parser.parse_args()
    articles, status = discover()
    payload = build_payload(articles, status)
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(articles)} matérias, {len(payload['records'])} trechos; confiança: {payload['confidence']}")


if __name__ == "__main__":
    main()
