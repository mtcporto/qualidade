const SOURCES = [
  { name: 'Paraíba Já', feeds: [], searches: ['https://paraibaja.com.br/?s=balneabilidade'], host: 'paraibaja.com.br' },
  { name: 'Jornal da Paraíba', feeds: ['https://jornaldaparaiba.com.br/rss'], searches: ['https://jornaldaparaiba.com.br/tags/balneabilidade'], host: 'jornaldaparaiba.com.br' },
  { name: 'F5 Online', feeds: ['https://f5online.com.br/feed/'], searches: ['https://f5online.com.br/?s=balneabilidade'], host: 'f5online.com.br' },
  { name: 'Repórter PB', feeds: ['https://www.reporterpb.com.br/rss'], searches: ['https://www.reporterpb.com.br/?s=balneabilidade', 'https://www.reporterpb.com.br/noticias/gerais', 'https://www.reporterpb.com.br/noticias'], host: 'reporterpb.com.br' },
];

const BEACHES = {
  'manaíra': 'João Pessoa', 'penha': 'João Pessoa', 'cabo branco': 'João Pessoa', 'tambaú': 'João Pessoa',
  'seixas': 'João Pessoa', 'jacarapé': 'João Pessoa', 'arraial': 'João Pessoa', 'praia do sol': 'João Pessoa',
  'maceió': 'Pitimbu', 'guarita': 'Pitimbu', 'acaú': 'Pitimbu', 'pontinha': 'Pitimbu', 'coqueiros': 'Pitimbu',
};

const MONTHS = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const RELEVANT = /balneabilidade|praias? impróprias?|praias? improprias?|impróprios? para banho|improprios? para banho/i;
const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const BEACH_MAP = Object.fromEntries(Object.entries(BEACHES).flatMap(([name, municipality]) => [
  [normalize(name), municipality],
  [normalize(`praia ${name}`), municipality],
]));
const clean = (value = '') => decodeEntities(value.replace(/\s+/g, ' ').trim().replace(/^[\s•–—-]+|[\s•–—-]+$/g, ''));

function decodeEntities(value) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}


async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'MareClara/2.0' }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function stripHtml(value) {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, '\n')).split(/\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function feedEntries(xml) {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(match => {
    const item = match[0];
    const read = tag => clean((item.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [,''])[1]);
    return { title: read('title'), url: decodeEntities((item.match(/<link>([\s\S]*?)<\/link>/i) || [,''])[1].trim()), published: read('pubDate') };
  });
}

function articleLinks(html, host) {
  const seen = new Set();
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match => ({
    url: new URL(match[1], `https://${host}`).href,
    title: stripHtml(match[2]),
  })).filter(item => {
    if (seen.has(item.url) || !item.url.includes(host) || item.title.length <= 20 || !RELEVANT.test(`${item.title} ${item.url}`)) return false;
    seen.add(item.url);
    return true;
  });
}

function monthNumber(value) { return MONTHS[normalize(value)] || null; }
function reportDate(day, month, year = new Date().getUTCFullYear()) {
  const monthIndex = monthNumber(month);
  return monthIndex ? new Date(Date.UTC(Number(year), monthIndex - 1, Number(day))) : null;
}
function formatPeriod(startDay, startMonth, endDay, endMonth = startMonth) {
  return normalize(startMonth) === normalize(endMonth)
    ? `${startDay} a ${endDay} de ${endMonth}`
    : `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`;
}

function extractPublishedDate(text) {
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (numeric) return new Date(Date.UTC(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1])));
  const match = text.match(/\b(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})\b/i);
  return match ? reportDate(match[1], match[2], match[3]) : null;
}

function findMetadata(text, published = '') {
  const compact = text.replace(/\s+/g, ' ');
  const parsedPublished = published ? new Date(published) : extractPublishedDate(compact);
  const referenceYear = parsedPublished && !Number.isNaN(parsedPublished.getTime()) ? parsedPublished.getUTCFullYear() : new Date().getUTCFullYear();
  const periodPatterns = [
    /(?:amostras?|coletas?|coletadas?|coletou)[^.]{0,120}?(?:entre\s+)?(\d{1,2})\s+de\s+([a-zç]+)\s+(?:a|e)\s+(\d{1,2})\s+de\s+([a-zç]+)/i,
    /(?:amostras?|coletas?|coletadas?|coletou)[^.]{0,120}?(?:entre\s+)?(\d{1,2})\s+(?:a|e)\s+(\d{1,2})\s+de\s+([a-zç]+)/i,
    /(?:período|periodo)[^.:]{0,70}(\d{1,2})\s+de\s+([a-zç]+)\s+(?:a|e)\s+(\d{1,2})\s+de\s+([a-zç]+)/i,
  ];
  const periodMatch = periodPatterns.map(pattern => compact.match(pattern)).find(Boolean);
  let periodo = null;
  let periodEnd = null;
  if (periodMatch?.length === 5) {
    periodo = formatPeriod(periodMatch[1], periodMatch[2], periodMatch[3], periodMatch[4]);
    periodEnd = reportDate(periodMatch[3], periodMatch[4], referenceYear);
  } else if (periodMatch?.length === 4) {
    periodo = `${periodMatch[1]} a ${periodMatch[2]} de ${periodMatch[3]}`;
    periodEnd = reportDate(periodMatch[2], periodMatch[3], referenceYear);
  }

  const validityMatch = compact.match(/(?:válid[oa]|validade)[^.]{0,90}?(?:até|dia)\s+(?:a próxima sexta-feira\s*\()?([0-9]{1,2})(?:\s+de\s+([a-zç]+))?/i);
  const validityMonth = validityMatch?.[2] || (periodEnd ? new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(periodEnd) : '');
  const validade = validityMatch ? `${validityMatch[1]}${validityMatch[2] ? ` de ${validityMatch[2]}` : ''}` : null;
  const validadeDate = validityMatch ? reportDate(validityMatch[1], validityMonth, referenceYear) : periodEnd;
  return { periodo: clean(periodo || ''), validade: clean(validade || ''), periodEnd, validadeDate, publishedDate: parsedPublished && !Number.isNaN(parsedPublished.getTime()) ? parsedPublished : null };
}

function beachName(value) {
  const normalized = normalize(value).replace(/^praia (do|da|de) /, '').replace(/^praia /, '');
  return BEACH_MAP[normalized] ? value.replace(/^praia (do|da|de) /i, '').trim() : value;
}

function extractRecords(text) {
  const records = [];
  const labels = Object.keys(BEACHES).sort((a, b) => b.length - a.length).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const labelPattern = `(?:praia\\s+(?:do|da|de)\\s+)?(?:${labels.join('|')})`;
  const labelRegex = new RegExp('(' + labelPattern + ')\\s*:', 'gi');
  const add = (rawBeach, point) => {
    const praia = beachName(clean(rawBeach));
    const ponto = clean(point).replace(/[.;]+$/, '');
    const municipality = BEACH_MAP[normalize(praia)] || BEACH_MAP[normalize(`praia ${praia}`)];
    if (municipality && ponto && !/própria|liberada|monitorada/i.test(ponto)) records.push({ municipio: municipality, praia, ponto, qualidade: 'Imprópria' });
  };
  for (const match of text.matchAll(labelRegex)) {
    const point = text.slice(match.index + match[0].length).match(/^\s*([^\n:]{3,180})/)?.[1];
    if (point) add(match[1], point);
  }
  return [...new Map(records.map(record => [`${normalize(record.municipio)}|${normalize(record.praia)}|${normalizePoint(record.ponto)}`, record])).values()];
}

function normalizePoint(value) {
  return normalize(value).replace(/^(?:em frente a|na altura de|na altura da|na altura do|na)\s+/, '')
    .replace(/\bver\.?\b/g, 'vereador').replace(/\bdas\b/g, 'da');
}

function candidateScore(candidate) {
  return candidate.validadeDate?.getTime() || candidate.periodEnd?.getTime() || candidate.publishedDate?.getTime() || 0;
}

function candidateFromLink(source, link) {
  return { ...link, source: source.name, publishedDate: link.published ? new Date(link.published) : null };
}

async function discover(source) {
  const found = [];
  for (const feed of source.feeds) {
    try {
      found.push(...feedEntries(await get(feed)).filter(entry => RELEVANT.test(`${entry.title} ${entry.url}`)).map(entry => candidateFromLink(source, entry)));
    } catch {}
  }
  for (const search of source.searches) {
    try {
      found.push(...articleLinks(await get(search), source.host).map(entry => candidateFromLink(source, entry)));
    } catch {}
  }
  const seen = new Set();
  return found.filter(item => !seen.has(item.url) && seen.add(item.url)).sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0)).slice(0, 12);
}

async function loadCandidate(source, candidate) {
  const text = stripHtml(await get(candidate.url));
  const metadata = findMetadata(text, candidate.published);
  const records = extractRecords(text);
  if (!metadata.periodEnd && !records.length) return null;
  if (metadata.publishedDate && metadata.publishedDate.getTime() > Date.now() + 86400000) return null;
  return { source: source.name, title: candidate.title, url: candidate.url, published: candidate.published || '', ...metadata, records };
}

function localTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function dateKey(date) { return date ? date.toISOString().slice(0, 10) : ''; }
function isCurrentDate(date) { return Boolean(date) && dateKey(date) > localTodayKey(); }
function reportDateFromLabel(label) {
  const match = String(label).match(/(\d{1,2})(?:\s+de\s+([a-zç]+))?/i);
  return match ? reportDate(match[1], match[2] || 'setembro') : null;
}
export function needsRefresh(payload) { return !payload?.validade || !isCurrentDate(reportDateFromLabel(payload.validade)); }

export async function collect() {
  const results = await Promise.all(SOURCES.map(async source => {
    try {
      const links = await discover(source);
      const candidates = (await Promise.all(links.map(link => loadCandidate(source, link).catch(() => null))).then(items => items.filter(Boolean))).sort((a, b) => candidateScore(b) - candidateScore(a));
      const article = candidates[0] || null;
      return { source, article, status: { name: source.name, found: Boolean(article), articles: links.length, error: null } };
    } catch (error) {
      return { source, article: null, status: { name: source.name, found: false, articles: 0, error: error.message } };
    }
  }));

  const allArticles = results.map(result => result.article).filter(Boolean);
  const latestScore = Math.max(...allArticles.map(candidateScore), 0);
  const articles = allArticles.filter(article => candidateScore(article) === latestScore);
  const groups = new Map();
  for (const article of articles) for (const record of article.records) {
    const id = `${normalize(record.municipio)}|${normalize(record.praia)}|${normalizePoint(record.ponto)}`;
    const group = groups.get(id) || { ...record, sources: [] };
    if (!group.sources.includes(article.source)) group.sources.push(article.source);
    groups.set(id, group);
  }
  const records = [...groups.values()].map(record => ({ ...record, confidence: record.sources.length >= 2 ? 'alta' : 'revisar' }));
  const periods = articles.map(article => article.periodo).filter(Boolean);
  const validities = articles.map(article => article.validade).filter(Boolean);
  const current = articles.length > 0 && isCurrentDate(articles[0].validadeDate || articles[0].periodEnd);
  const reportSources = articles.length;
  return {
    generated_at: new Date().toISOString(),
    periodo: periods[0] || null,
    validade: validities[0] || null,
    confidence: records.length && reportSources >= 2 ? 'alta' : 'revisar',
    current,
    report_sources: reportSources,
    records,
    articles: articles.map(({ periodEnd, validadeDate, publishedDate, ...article }) => article),
    sources: results.map(result => result.status),
    official_reference: 'https://sudema.pb.gov.br/qualidade-do-ambiente/qualidade-dos-mares',
    official_reference_automated: false,
  };
}
