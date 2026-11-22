#!/usr/bin/env python3
"""Produit les polices statiques (TTF) utilisées par le serveur pour dessiner les images d'aperçu.

Le site sert Geist en WOFF2 variable ; le moteur de rendu des images (resvg) attend des TTF statiques.
Geist est distribuée sous licence SIL Open Font License 1.1 (redistribution autorisée, voir OFL.txt).
    pip install fonttools brotli && python3 tools/og_fonts.py
"""
import pathlib
import shutil
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "server" / "assets" / "fonts"
SRC = {
    "Geist": ROOT / "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
    "GeistMono": ROOT / "node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
}
INSTANCES = {"Geist": [400, 600], "GeistMono": [400]}

OUT.mkdir(parents=True, exist_ok=True)
for family, path in SRC.items():
    for wght in INSTANCES[family]:
        font = TTFont(path)
        font.flavor = None
        inst = instantiateVariableFont(font, {"wght": wght})
        dest = OUT / f"{family}-{wght}.ttf"
        inst.save(dest)
        print(dest.relative_to(ROOT), dest.stat().st_size)
lic = next((ROOT / "node_modules/@fontsource-variable/geist").glob("LICEN*"), None)
if lic:
    shutil.copy(lic, OUT / "OFL.txt")
