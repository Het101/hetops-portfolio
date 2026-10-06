"""Build /writing from Markdown in writing/src: one page per post plus an index.

No dependencies: a small Markdown subset (headings, paragraphs, lists, fenced code,
blockquotes, inline code, bold, italics, links). Run from the repo root:
    python scripts/build-writing.py
"""
import html, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'writing' / 'src'

POSTS = [  # newest first; slug, source, date, kicker, og image
    ('aws-extended-support', 'aws-extended-support.md', '2026-10-05', 'AWS · FinOps', 'og-retirement-radar.png'),
    ('acs-chat-migration', 'acs-chat-migration.md', '2026-10-04', 'Post-mortem', 'og-threadvault.png'),
]
EXTERNAL = [('2024-04-01', 'Medium', 'Scaling Kubernetes at enterprise scale: HPA/VPA tuning, multi-cloud autoscaling and zero-downtime rollouts',
             'https://medium.com/@het101/scaling-kubernetes-at-enterprise-scale-c3a3c9256671')]


def front_matter(text):
    meta = {}
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip().strip('"')
        text = text[m.end():]
    return meta, re.sub(r'<!--.*?-->', '', text, flags=re.S).strip()


def inline(s):
    codes = []
    s = re.sub(r'`([^`]+)`', lambda m: codes.append(m.group(1)) or f'\x00{len(codes) - 1}\x00', s)
    s = html.escape(s, quote=False)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{html.escape(m.group(2))}"{"" if m.group(2).startswith(("/", "#")) else " target=\"_blank\" rel=\"noopener\""}>{m.group(1)}</a>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?![\w*])', r'<em>\1</em>', s)
    return re.sub('\x00(\\d+)\x00', lambda m: f'<code>{html.escape(codes[int(m.group(1))])}</code>', s)


def markdown(text):
    out, lines, i = [], text.split('\n'), 0
    slug = lambda t: re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
    while i < len(lines):
        line = lines[i]
        if not line.strip(): i += 1; continue
        if line.startswith('```'):
            lang, code, i = line[3:].strip(), [], i + 1
            while i < len(lines) and not lines[i].startswith('```'): code.append(lines[i]); i += 1
            out.append(f'<pre><code{f" data-lang=\"{lang}\"" if lang else ""}>{html.escape(chr(10).join(code))}</code></pre>'); i += 1; continue
        m = re.match(r'(#{1,4}) (.*)', line)
        if m:
            lvl = max(2, len(m.group(1))); t = m.group(2).strip()
            if len(m.group(1)) == 1: i += 1; continue  # the page title comes from front matter
            out.append(f'<h{lvl} id="{slug(t)}">{inline(t)}</h{lvl}>'); i += 1; continue
        if re.match(r'\s*[-*] ', line) or re.match(r'\s*\d+\. ', line):
            ordered = bool(re.match(r'\s*\d+\. ', line)); items = []
            while i < len(lines) and (re.match(r'\s*([-*]|\d+\.) ', lines[i]) or (lines[i].startswith('  ') and items)):
                if re.match(r'\s*([-*]|\d+\.) ', lines[i]): items.append(re.sub(r'\s*([-*]|\d+\.) ', '', lines[i], count=1))
                else: items[-1] += ' ' + lines[i].strip()
                i += 1
            tag = 'ol' if ordered else 'ul'
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>'); continue
        if line.startswith('>'):
            quote = []
            while i < len(lines) and lines[i].startswith('>'): quote.append(lines[i].lstrip('> ')); i += 1
            out.append(f'<blockquote><p>{inline(" ".join(quote))}</p></blockquote>'); continue
        if re.match(r'^(-{3,}|\*{3,})$', line.strip()): out.append('<hr>'); i += 1; continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r'(#{1,4} |```|>|\s*[-*] |\s*\d+\. )', lines[i]): para.append(lines[i].strip()); i += 1
        out.append(f'<p>{inline(" ".join(para))}</p>')
    return '\n'.join(out)


BRAND = '<svg class="brand-mark" aria-hidden="true" viewBox="10 22 80 56"><rect x="10" y="22" width="24" height="56" rx="5"/><rect x="66" y="22" width="24" height="56" rx="5"/><rect x="33" y="46" width="34" height="8"/><circle cx="50" cy="50" r="11"/></svg>'


def page(title, desc, canon, og, body, kind='article'):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  <link rel="canonical" href="https://hetops.dev{canon}">
  <meta name="theme-color" content="#08090a">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="{kind}">
  <meta property="og:url" content="https://hetops.dev{canon}">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:image" content="https://hetops.dev/assets/og/{og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://hetops.dev/assets/og/{og}">
  <link rel="preload" href="/assets/fonts/Archivo.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <script defer src="https://analytics.hetops.dev/script.js" data-website-id="3b6004b2-abef-471c-a807-fdacd7981321" data-domains="hetops.dev"></script>
</head>
<body class="cs">
  <a class="skip" href="#main">Skip to content</a>
  <header class="nav scrolled">
    <a class="brand" href="/" aria-label="HetOps home">{BRAND}<span>HetOps</span></a>
    <nav class="nav-links" aria-label="Site"><a href="/writing/"{' aria-current="page"' if canon == '/writing/' else ''}>Writing</a><a href="/#work">Work</a><a href="/#contact">Contact</a></nav>
    <div class="nav-actions"><a class="nav-cv" href="/Het_Patel_Resume.pdf" target="_blank" rel="noopener">Résumé</a></div>
  </header>
  <main id="main" class="cs-main wrap">
{body}
    <section class="cs-next">
      <h2>Got a production problem worth solving?</h2>
      <div class="ctas">
        <a class="btn btn-gold" href="mailto:patel.x.het@gmail.com" data-umami-event="email-click" data-umami-event-from="writing"><i class="ph ph-envelope-simple" aria-hidden="true"></i>Email me</a>
        <a class="btn btn-line" href="/writing/"><i class="ph ph-arrow-left" aria-hidden="true"></i>All writing</a>
      </div>
    </section>
  </main>
  <footer class="footer wrap">
    <span class="brand">{BRAND}<span>HetOps</span></span>
    <nav aria-label="HetOps tools"><a href="https://dns.hetops.dev">DNS</a><a href="https://tools.hetops.dev">Tools</a><a href="https://status.hetops.dev">Status</a></nav>
    <span class="copyright">© 2026 Het Patel</span>
  </footer>
  <script src="/case.js" defer></script>
</body>
</html>
'''


def nice_date(d):
    y, m, dd = d.split('-')
    return f"{int(dd)} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][int(m) - 1]} {y}"


entries = []
for slug, src, date, kicker, og in POSTS:
    meta, text = front_matter((SRC / src).read_text(encoding='utf-8'))
    title, desc = meta['title'], meta.get('description', '')
    words = len(re.findall(r'\w+', text)); mins = max(1, round(words / 230))
    body = f'''    <article class="wr">
      <a class="cs-back" href="/writing/"><i class="ph ph-arrow-left" aria-hidden="true"></i>All writing</a>
      <p class="wr-meta"><span>{kicker}</span><time datetime="{date}">{nice_date(date)}</time><span>{mins} min read</span></p>
      <h1>{html.escape(title)}</h1>
      <p class="wr-dek">{html.escape(desc)}</p>
      <div class="wr-body">
{markdown(text)}
      </div>
    </article>'''
    d = ROOT / 'writing' / slug; d.mkdir(parents=True, exist_ok=True)
    (d / 'index.html').write_text(page(f'{title} · Het Patel', desc, f'/writing/{slug}/', og, body), encoding='utf-8', newline='\n')
    entries.append((date, kicker, title, desc, f'/writing/{slug}/', mins))

items = ''.join(f'''
        <li><a href="{url}"><span class="post-meta">{nice_date(d)} · {k}</span><span class="post-title">{html.escape(t)}</span><span class="wr-sum">{html.escape(ds)} {m} min read.</span></a></li>''' for d, k, t, ds, url, m in entries)
items += ''.join(f'''
        <li><a href="{u}" target="_blank" rel="noopener"><span class="post-meta">{nice_date(d)} · {src}</span><span class="post-title">{html.escape(t)}</span><span class="wr-sum">On {src}.</span></a></li>''' for d, src, t, u in EXTERNAL)
index = f'''    <section class="cs-hero">
      <h1>Writing</h1>
      <p class="cs-lede">Post-mortems, production lessons and the reasoning behind the tools. Every number is checked against its source.</p>
    </section>
    <section class="cs-sec">
      <ul class="posts wr-list">{items}
      </ul>
    </section>'''
(ROOT / 'writing' / 'index.html').write_text(page('Writing · Het Patel', 'Post-mortems, production lessons and the reasoning behind the tools, by Het Patel.', '/writing/', 'og.png', index, 'website'), encoding='utf-8', newline='\n')
print('built', [e[4] for e in entries] + ['/writing/'])
