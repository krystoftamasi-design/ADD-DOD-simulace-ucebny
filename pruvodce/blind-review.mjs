import { readFile, readdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function openBlindReview(root, categories, file = new URL('lidska-hodnoceni.jsonl', root)) {
  const names = (await readdir(root)).filter(n => /^vysledky-syntetickych-dotazu-.*\.json$/.test(n)).sort().reverse();
  let source, report, fingerprint;
  for (const name of names) {
    const raw = await readFile(new URL(name, root), 'utf8');
    const data = JSON.parse(raw);
    if (data.completedAt && data.results?.length && data.results.every(r => Array.isArray(r.actual))) {
      source = name; report = data; fingerprint = createHash('sha256').update(raw).digest('hex'); break;
    }
  }
  const records = new Map();
  try {
    for (const line of (await readFile(file, 'utf8')).split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      if (r.sourceHash === fingerprint) records.set(r.caseId, r);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let queue = Promise.resolve();
  function state(onlyDisagreements = false) {
    const rows = (report?.results ?? []).filter(r => !onlyDisagreements || (Array.isArray(r.expected) && Array.isArray(r.actual) && (r.expected.length !== r.actual.length || r.expected.some(id => !r.actual.includes(id)) || r.outcomeMatches === false)));
    const next = rows.find(r => !records.has(r.id));
    return { source: source ?? null, sourceHash: fingerprint ?? null, total: rows.length, reviewed: rows.filter(r => records.has(r.id)).length, categories,
      item: next ? { id: next.id, text: next.text } : null };
  }
  function save(input) {
    const task = queue.then(async () => {
      const row = report?.results.find(r => r.id === input.caseId);
      const ids = input.tags;
      if (!row || input.sourceHash !== fingerprint || !['rated', 'ambiguous'].includes(input.verdict) || !Array.isArray(ids) || ids.length > 2 || new Set(ids).size !== ids.length || ids.some(id => !categories.some(c => c.id === id)) || typeof input.note !== 'string' || input.note.length > 2000 || (input.verdict === 'ambiguous' && !input.note.trim())) {
        const error = new Error('Vyber nejvýše dva tagy a u nejasné věty napiš důvod.'); error.status = 400; throw error;
      }
      let record = records.get(row.id);
      if (!record) {
        record = { timestamp: new Date().toISOString(), source, sourceHash: fingerprint, caseId: row.id, text: row.text, verdict: input.verdict, tags: ids, note: input.note.trim(), categories, model: report.model };
        await appendFile(file, JSON.stringify(record) + '\n', 'utf8');
        records.set(row.id, record);
      }
      return { saved: true, review: record, comparison: { actual: row.actual, syntheticExpected: row.expected, modelMatchesHuman: record.verdict === 'rated' ? row.actual.length === record.tags.length && row.actual.every(id => record.tags.includes(id)) : null, ...(row.search ? { search: row.search } : {}) }, progress: { reviewed: records.size, total: report.results.length } };
    });
    queue = task.catch(() => {});
    return task;
  }
  async function saveManual(input) {
    if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 2000 || !Array.isArray(input.tags) || input.tags.length < 1 || input.tags.length > 2 || new Set(input.tags).size !== input.tags.length || input.tags.some(id => !categories.some(c => c.id === id))) {
      const error = new Error('Napiš větu a vyber jeden nebo dva tagy.'); error.status = 400; throw error;
    }
    const record = { timestamp: new Date().toISOString(), sourceType: 'human-authored', text: input.text.trim(), tags: input.tags, categories };
    await appendFile(file, JSON.stringify(record) + '\n', 'utf8');
    return { saved: true, review: record };
  }
  return { state, save, saveManual };
}
