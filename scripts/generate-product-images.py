#!/usr/bin/env python3
"""Génère une image par produit du catalogue : frontend/public/produits/<slug>.png

Ce sont des illustrations (emoji couleur sur fond dégradé par catégorie), pas des photos : elles servent
d'image par défaut. Remplacez-les à tout moment par de vraies photos depuis Admin → Produits.

Usage (depuis la racine du projet) :
    node -e "…"   # voir ci-dessous : la liste vient de backend/data/product-emojis.json
    python3 scripts/generate-product-images.py
Nécessite Pillow (pip install pillow) et la police « Noto Color Emoji ».
"""
import json, os, re, sys, unicodedata
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMOJI_FONT = os.environ.get('EMOJI_FONT', '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')
OUT = os.path.join(ROOT, 'frontend', 'public', 'produits')
SIZE = 480

PALETTE = {  # catégorie : (haut, bas)
    'Électronique': ('#dbeafe', '#93c5fd'), 'Téléphones & Tablettes': ('#e0e7ff', '#a5b4fc'), 'Informatique': ('#e2e8f0', '#94a3b8'),
    'Énergie solaire': ('#fef3c7', '#fcd34d'), 'Maison': ('#ffedd5', '#fdba74'), 'Vêtements': ('#fae8ff', '#e879f9'),
    'Chaussures': ('#dcfce7', '#86efac'), 'Accessoires': ('#ede9fe', '#c4b5fd'), 'Beauté & Soins': ('#ffe4e6', '#fda4af'),
    'Alimentation & Boissons': ('#ecfccb', '#bef264'), 'Sport & Fitness': ('#cffafe', '#67e8f9'), 'Bébé & Enfants': ('#fef9c3', '#fde047'),
    'Bureau & Papeterie': ('#f1f5f9', '#cbd5e1'), 'Artisanat & Déco': ('#fde7d3', '#e9a96b'),
    # nouveaux rayons : frais (tons chauds et verts), épicerie, général
    'Fruits & légumes': ('#dcfce7', '#4ade80'), 'Boulangerie & pâtisserie': ('#fef3c7', '#f0b86b'), 'Boucherie & poissonnerie': ('#fee2e2', '#f87171'),
    'Produits laitiers & œufs': ('#e0f2fe', '#7dd3fc'), 'Épicerie sèche': ('#fef9c3', '#facc15'), 'Boissons': ('#cffafe', '#22d3ee'),
    'Entretien & ménage': ('#ede9fe', '#a78bfa'), 'Pharmacie & santé': ('#ccfbf1', '#2dd4bf'), 'Bricolage & jardin': ('#e7e5e4', '#a8a29e'),
    'Jouets & loisirs': ('#fce7f3', '#f472b6'), 'Auto & moto': ('#e2e8f0', '#64748b'),
}

def hex2rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def background(top, bottom):
    t, b = hex2rgb(top), hex2rgb(bottom)
    img = Image.new('RGB', (SIZE, SIZE))
    px = img.load()
    for y in range(SIZE):
        k = y / (SIZE - 1)
        row = tuple(int(t[i] + (b[i] - t[i]) * k) for i in range(3))
        for x in range(SIZE):
            px[x, y] = row
    return img.convert('RGBA')

def render(emoji, category):
    top, bottom = PALETTE.get(category, ('#f1f5f9', '#cbd5e1'))
    img = background(top, bottom)
    # disque clair derrière le produit
    disc = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(disc)
    r = 190
    d.ellipse((SIZE / 2 - r, SIZE / 2 - r, SIZE / 2 + r, SIZE / 2 + r), fill=(255, 255, 255, 120))
    img = Image.alpha_composite(img, disc)
    # emoji
    font = ImageFont.truetype(EMOJI_FONT, 109)
    glyph = Image.new('RGBA', (136, 128), (0, 0, 0, 0))
    ImageDraw.Draw(glyph).text((0, 0), emoji, font=font, embedded_color=True)
    glyph = glyph.crop(glyph.getbbox())
    scale = 270 / max(glyph.size)
    glyph = glyph.resize((int(glyph.width * scale), int(glyph.height * scale)), Image.LANCZOS)
    x, y = (SIZE - glyph.width) // 2, (SIZE - glyph.height) // 2 - 6
    # ombre portée
    shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    alpha = glyph.split()[3].point(lambda a: int(a * 0.28))
    shadow.paste((20, 30, 50, 255), (x + 6, y + 12), alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    img = Image.alpha_composite(img, shadow)
    img.alpha_composite(glyph, (x, y))
    return img.convert('RGB')

if __name__ == '__main__':
    items = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/images.json'))
    os.makedirs(OUT, exist_ok=True)
    for it in items:
        render(it['emoji'], it['category']).save(os.path.join(OUT, it['slug'] + '.png'), optimize=True)
    print(len(items), 'images →', OUT)
