#!/usr/bin/env python3
"""Génère les images d'aperçu (Open Graph, 1200×630) de chaque section dans public/og/.

Outil de développement, lancé à la main quand un titre change :
    pip install playwright && playwright install chromium
    python3 tools/og_images.py
Les polices sont celles du site (node_modules/@fontsource-variable), aucune ressource réseau.
"""
import asyncio
import pathlib

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"
FONT = ROOT / "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"
MONO = ROOT / "node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"

PAGES = {
    "accueil": ("DNS, DHCP, IPAM, RADIUS et PKI.", "Une seule appliance."),
    "docs": ("Documentation", "Installation, architecture, cluster, feuille de route."),
    "comparatif": ("Ipnoria face à Windows Server", "DNS, DHCP, NPS et AD CS, capacité par capacité."),
    "guides": ("Guides de migration", "Quitter un DHCP Windows ou un NPS sans coupure."),
    "nouveautes": ("Nouveautés", "Chaque version, ce qu'elle change, ce qui a été vérifié."),
    "contact": ("Contact", "Démonstration, question technique, retour d'essai."),
}

MARK = """<svg viewBox="0 0 24 24" width="64" height="64"><rect width="24" height="24" rx="6.5" fill="#141a28"/>
<rect x=".5" y=".5" width="23" height="23" rx="6" fill="none" stroke="rgba(255,255,255,.14)"/>
<g fill="rgba(255,255,255,.16)"><circle cx="6" cy="9" r="1"/><circle cx="18" cy="9" r="1"/><circle cx="6" cy="13.5" r="1"/>
<circle cx="18" cy="13.5" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/></g>
<rect x="10.4" y="10" width="3.2" height="9" rx="1.6" fill="#edf0f7"/><circle cx="12" cy="6" r="2.1" fill="#5b8cff"/></svg>"""


def html(title: str, sub: str) -> str:
    cells = "".join(
        f'<i style="background:{"#5b8cff" if (i * 7) % 11 < 5 else "rgba(255,255,255,.05)"}"></i>' for i in range(96)
    )
    return f"""<!doctype html><html><head><style>
@font-face {{ font-family: Geist; src: url('{FONT.as_uri()}') format('woff2'); font-weight: 100 900; }}
@font-face {{ font-family: GeistMono; src: url('{MONO.as_uri()}') format('woff2'); font-weight: 100 900; }}
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: 1200px; height: 630px; background: #07090f; color: #edf0f7; font-family: Geist; overflow: hidden; position: relative; }}
.glow {{ position: absolute; inset: 0; background: radial-gradient(60% 70% at 15% 0%, rgba(91,140,255,.28), transparent 70%); }}
.wrap {{ position: absolute; inset: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }}
.brand {{ display: flex; align-items: center; gap: 20px; font-size: 40px; font-weight: 600; letter-spacing: -.02em; }}
h1 {{ font-size: 76px; font-weight: 600; letter-spacing: -.045em; line-height: 1.02; max-width: 820px;
     background: linear-gradient(#fff, rgba(255,255,255,.7)); -webkit-background-clip: text; color: transparent; }}
p {{ margin-top: 22px; font-size: 32px; color: #9aa3b8; max-width: 760px; letter-spacing: -.01em; }}
.grid {{ position: absolute; right: 80px; top: 72px; display: grid; grid-template-columns: repeat(12, 18px); gap: 5px; opacity: .9; }}
.grid i {{ width: 18px; height: 18px; border-radius: 4px; display: block; }}
.url {{ font-family: GeistMono; font-size: 24px; color: #9aa3b8; }}
</style></head><body><div class="glow"></div><div class="grid">{cells}</div>
<div class="wrap"><div class="brand">{MARK}Ipnoria</div>
<div><h1>{title}</h1><p>{sub}</p></div><div class="url">Appliance DDI libre</div></div></body></html>"""


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=__import__('os').environ.get('CHROME_PATH') or None)
        page = await browser.new_page(viewport={"width": 1200, "height": 630})
        for key, (title, sub) in PAGES.items():
            # Fichier local (et non set_content) : une page about:blank ne peut pas charger les polices file://
            tmp = OUT / f".{key}.html"
            tmp.write_text(html(title, sub), encoding="utf-8")
            await page.goto(tmp.as_uri(), wait_until="load")
            tmp.unlink()
            await page.evaluate("document.fonts.ready")
            await page.screenshot(path=str(OUT / f"{key}.png"))
            print(f"public/og/{key}.png")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
