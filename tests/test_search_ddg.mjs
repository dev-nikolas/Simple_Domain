import fs from 'fs';

const html = fs.readFileSync('Simple_Domain/tests/ddg_sample.html', 'utf8');
const results = [];
const blocks = html.split(/class=["']result results_links/);

for (let i = 1; i < blocks.length; i++) {
  const b = blocks[i];
  const titleM = b.match(/<a[^>]*class=["']result__a["'][^>]*>([\s\S]*?)<\/a>/i);
  const snippetM = b.match(/<a[^>]*class=["']result__snippet["'][^>]*>([\s\S]*?)<\/a>/i);
  const urlM = b.match(/<a[^>]*class=["']result__url["'][^>]*href=["']([^"']+)["']/i);

  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
  const snippet = snippetM ? snippetM[1].replace(/<[^>]+>/g, '').trim() : '';
  const url = urlM ? urlM[1].trim() : '';

  if (title || snippet) {
    results.push({ title, snippet, url });
  }
}

console.log('Parsed count:', results.length);
console.log(JSON.stringify(results.slice(0, 3), null, 2));
