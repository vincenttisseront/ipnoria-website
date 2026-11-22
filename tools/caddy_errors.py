#!/usr/bin/env python3
"""Génère les pages d'erreur servies par Caddy quand l'application ne répond pas (502, 503, 504)
et la page de maintenance. Pages autonomes : aucune ressource externe, styles en ligne, FR et EN."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'caddy-errors'
MARK = ('<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect width="24" height="24" rx="6.5" fill="#141a28"/>'
        '<rect x=".5" y=".5" width="23" height="23" rx="6" fill="none" stroke="rgb(255 255 255 / .14)"/>'
        '<g fill="rgb(255 255 255 / .16)"><circle cx="6" cy="9" r="1"/><circle cx="18" cy="9" r="1"/><circle cx="6" cy="13.5" r="1"/>'
        '<circle cx="18" cy="13.5" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/></g>'
        '<rect x="10.4" y="10" width="3.2" height="9" rx="1.6" fill="#edf0f7"/><circle cx="12" cy="6" r="2.1" fill="#5b8cff"/></svg>')

CSS = """
:root{color-scheme:dark;--bg:#07090f;--fg:#edf0f7;--muted:#9aa3b8;--line:rgb(255 255 255/.09);--code:#05070c;--accent:#5b8cff;--warn:#f2b33d}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:#f6f7fa;--fg:#0d1321;--muted:#4c566b;--line:rgb(11 18 34/.1);--accent:#2a5bd7}}
*{box-sizing:border-box}
html{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg)}
header{display:flex;align-items:center;gap:.6rem;padding:1.25rem clamp(1.25rem,5vw,4rem);font-weight:600;letter-spacing:-.01em}
main{flex:1;display:grid;gap:3rem;align-content:center;padding:2rem clamp(1.25rem,5vw,4rem) 5rem;max-width:72rem;width:100%;margin:0 auto}
@media (min-width:60rem){main{grid-template-columns:1fr 24rem;align-items:center}}
.code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:var(--muted);margin:0}
h1{font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.05;letter-spacing:-.035em;font-weight:600;margin:.6rem 0 0;max-width:18ch}
p.lead{font-size:1.15rem;line-height:1.6;color:var(--muted);max-width:36rem;margin:1.25rem 0 0}
a.btn{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;margin-top:2rem;padding:0 1.1rem;border-radius:.6rem;background:var(--fg);color:var(--bg);font-weight:500;text-decoration:none}
a.btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.term{border:1px solid var(--line);border-radius:1rem;background:var(--code);color:#edf0f7;overflow:hidden}
.term div{display:flex;gap:.4rem;align-items:center;height:2.6rem;padding:0 1rem;border-bottom:1px solid rgb(255 255 255/.08)}.term i{width:.6rem;height:.6rem;border-radius:50%;background:rgb(255 255 255/.15)}
.term pre{margin:0;padding:1.2rem 1.25rem;font:.82rem/1.6 ui-monospace,"SF Mono",Menlo,Consolas,monospace;white-space:pre-wrap}
.m{color:#9aa3b8}.w{color:#f2b33d}
.alt{margin-top:2.5rem;font-size:.9rem;color:var(--muted)}.alt a{color:inherit}
"""

PAGES = {
  '50x': {
    'fr': ('Le site redémarre', "Le serveur ne répond pas pour le moment, le plus souvent pendant une mise à jour. Réessayez dans une minute.",
           'Réessayer', 'SERVFAIL', 'en DNS, ce serait :', 'English version', '/en/'),
    'en': ('The site is restarting', "The server isn't answering right now, most often during an update. Try again in a minute.",
           'Try again', 'SERVFAIL', 'in DNS, this would be:', 'Version française', '/'),
  },
  'maintenance': {
    'fr': ('Maintenance en cours', "Le site est en cours de mise à jour. Il revient dans quelques minutes ; la documentation reste lisible sur GitHub.",
           'Réessayer', 'REFUSED', 'en DNS, ce serait :', 'English version', '/en/'),
    'en': ('Maintenance in progress', "The site is being updated. It will be back in a few minutes; the documentation stays readable on GitHub.",
           'Try again', 'REFUSED', 'in DNS, this would be:', 'Version française', '/'),
  },
}
STATUS = {'50x': '502', 'maintenance': '503'}

def page(kind: str, lang: str) -> str:
  title, text, retry, rcode, note, other, other_href = PAGES[kind][lang]
  code = STATUS[kind]
  # Les pages 50x passent par le moteur de gabarits de Caddy : le vrai code (502, 503 ou 504) y est inséré
  if kind == '50x':
    code = '{{placeholder "http.error.status_code"}}'
  label = ('Erreur ' if lang == 'fr' else 'Error ') + code
  return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{title} – Ipnoria</title>
<style>{CSS.strip()}</style>
</head>
<body>
<header>{MARK}<span>Ipnoria</span></header>
<main>
<div>
<p class="code">{label}</p>
<h1>{title}</h1>
<p class="lead">{text}</p>
<a class="btn" href="">{retry}</a>
<p class="alt"><a href="{other_href}" lang="{'en' if lang == 'fr' else 'fr'}">{other}</a></p>
</div>
<div class="term" aria-hidden="true"><div><i></i><i></i><i></i></div><pre><span class="m">$</span> curl -sI https://…
<span class="w">HTTP/2 {code}</span>

<span class="m">; {note}</span> <span class="w">{rcode}</span></pre></div>
</main>
</body>
</html>
"""

for kind in PAGES:
  for lang in ('fr', 'en'):
    out = ROOT / ('en' if lang == 'en' else '') / f'{kind}.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(kind, lang), encoding='utf-8')
    print(out.relative_to(ROOT.parent))
