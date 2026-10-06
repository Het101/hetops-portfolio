// Every inline script in index.html must be allowed by the CSP that nginx sends, by hash.
// Usage: node scripts/check-csp.mjs <file with the response headers>
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('index.html', 'utf8');
const headers = readFileSync(process.argv[2] || 'nginx/security-headers.conf', 'utf8');
const csp = (headers.match(/content-security-policy:? "?([^"\n]*)/i) || [])[1] || '';
if (!csp) { console.error('::error::no Content-Security-Policy found'); process.exit(1); }

// JSON-LD is data, never executed, so the CSP does not govern it.
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter((m) => !/application\/ld\+json/.test(m[1]));
let bad = 0;
for (const m of inline) {
  const h = createHash('sha256').update(m[2]).digest('base64');
  if (!csp.includes(`'sha256-${h}'`)) { console.error(`::error::inline script not allowed by the CSP: sha256-${h}`); bad++; }
}
if (bad) process.exit(1);
console.log(`${inline.length} inline script(s), all allowed by hash`);
