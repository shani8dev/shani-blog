#!/usr/bin/env python3
"""
generate-cover.py — branded cover image generator for shani-blog posts.

Every post's `cover:` frontmatter field points at a generated cover under
assets/images/blog/<slug>.webp: a dark, on-brand graphic (brand-shani.css
palette + real Playfair Display/DM Sans fonts + a large Font Awesome icon
matching the post's actual subject) rather than a stock photo or a
text-heavy card. The icon is deliberately centred, not off to one side —
this same image is object-fit:cover'd into at least three different crop
ratios across the site's CSS (the main grid card at 16:9, the desktop
`.card.featured` variant at a near-square 270x260, and the sidebar
`.related-card__visual` thumbnail at a fixed 100px height with unpredictable
width) — centring degrades gracefully across all of them; anything off-centre
looks fine in one crop and wrong in another.

USAGE
    python3 scripts/generate-cover.py --slug my-new-post --tag Guide --icon fa-rocket
    python3 scripts/generate-cover.py --slug my-new-post --icon fa-windows --icon-brand
    python3 scripts/generate-cover.py --slug my-new-post --icon fa-desktop --icon2 fa-plus

    --tag is optional: if omitted, it's read from posts/<slug>.md's own
    `tag:` frontmatter field, so you usually only need --slug and --icon.

    --icon-brand: pass this when the icon lives in Font Awesome's "brands"
    set (logos: Windows, Android, Docker, Linux, Bluetooth, etc.) rather
    than "solid" (everything else). Get it wrong and the glyph renders
    blank — script errors out with a clear message if the codepoint isn't
    in the font you asked for, precisely so this doesn't fail silently.

    --icon2 / --icon2-brand: an optional small second icon in a badge
    orbiting the main one, for posts that are genuinely "X + Y" (e.g. the
    COSMIC-edition announcement uses fa-desktop + fa-plus for "new desktop
    edition"). Skip it for anything that doesn't need two icons — most
    posts don't.

FINDING AN ICON NAME
    Icon names are Font Awesome 6.5 class names without the `fa-solid`/
    `fa-brands` prefix, e.g. the class `fa-solid fa-shield-halved` is just
    `fa-shield-halved` here. Browse the free icon set at
    https://fontawesome.com/search?o=r&m=free — filter by the "Free"
    filter, since Pro-only icons aren't in the bundled font files.

    To check a name is valid before generating (or to search by keyword),
    use:
        python3 scripts/generate-cover.py --search shield
    which lists every bundled icon name containing "shield".

AFTER GENERATING
    Add the result to the post's frontmatter:
        cover: /assets/images/blog/<slug>.webp
    then run `node generate-manifest.js` to regenerate the stub/manifest
    so the new og:image/card-visual picks it up.

REQUIREMENTS
    Python 3 + Pillow (`pip install --break-system-packages Pillow`, or use
    a venv). No other dependency — fonts and the Font-Awesome name→codepoint
    map (fa_map.json) are bundled in scripts/fonts/ next to this file.
    fa_map.json was built once from Font Awesome 6.5.0's own all.min.css
    (every `.fa-name:before{content:"\\XXXX"}` rule) and only needs
    rebuilding if the site's Font Awesome CDN version changes — see
    `rebuild_fa_map()` at the bottom of this file.
"""
import argparse
import glob
import json
import math
import os
import random
import re
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(SCRIPT_DIR, "fonts")
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "assets", "images", "blog")

W, H = 1200, 630

# ── Brand palette — must match brand-shani.css's --color-* custom
# properties. If that file's palette ever changes, update these too.
BG = (22, 21, 20)            # --color-bg
TEXT = (245, 244, 242)       # --color-text
TEXT_MUTED = (176, 170, 164)  # --color-text-muted
ACCENT = (255, 127, 80)      # --color-accent (coral)
SECONDARY = (159, 114, 245)  # --color-secondary (purple)
SUCCESS = (61, 186, 126)     # --color-success
WARNING = (232, 162, 21)     # --color-warning
ERROR = (237, 95, 95)        # --color-error
LIKE = (224, 92, 122)        # --color-like
BLUE = (90, 156, 247)        # --color-callout-note

# One accent colour per post tag, reusing the site's own semantic tokens
# so a tag means the same thing here as it does in the UI elsewhere.
TAG_COLORS = {
    "Guide": ACCENT,
    "Deep Dive": SECONDARY,
    "Reference": BLUE,
    "Ecosystem": SUCCESS,
    "Release": WARNING,
    "Migration": LIKE,
    "Enterprise": ERROR,
}


def _fa_map():
    with open(os.path.join(FONT_DIR, "fa_map.json"), encoding="utf-8") as f:
        return json.load(f)


def fa_char(icon_name, fa_map):
    if icon_name not in fa_map:
        sys.exit(
            f"error: unknown icon '{icon_name}'. Run "
            f"`python3 {os.path.basename(__file__)} --search <keyword>` to find valid names."
        )
    return chr(int(fa_map[icon_name], 16))


def fa_font(size, brand=False):
    return ImageFont.truetype(
        os.path.join(FONT_DIR, "fa-brands.ttf" if brand else "fa-solid.ttf"), size
    )


def _variable_font(path, size, weight):
    f = ImageFont.truetype(path, size)
    try:
        axes = f.get_variation_axes()
        vals = [weight if a["name"] == b"Weight" else a["default"] for a in axes]
        f.set_variation_by_axes(vals)
    except Exception:
        pass  # non-variable fallback font — just use it at default weight
    return f


def dmsans(size, weight=600):
    return _variable_font(os.path.join(FONT_DIR, "dmsans.ttf"), size, weight)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_glyph_centered(draw, cx, cy, ch, font, fill):
    bbox = draw.textbbox((0, 0), ch, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), ch, font=font, fill=fill)


def make_cover(tag, icon_name, icon_is_brand, out_path, seed=0, icon2=None, icon2_brand=False):
    fa_map = _fa_map()
    rnd = random.Random(seed)
    accent = TAG_COLORS.get(tag, ACCENT)
    img = Image.new("RGB", (W, H), BG)

    # Atmospheric glow, off-centre for depth — purely decorative, so it can
    # sit anywhere without affecting how the image crops elsewhere.
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    cx, cy = W * 0.28, H * 1.05
    max_r = 820
    for i in range(60, 0, -1):
        t = i / 60
        r = max_r * t
        col = lerp(BG, accent, (1 - t) ** 2 * 0.9)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    img = Image.blend(img, glow, 0.55)

    draw = ImageDraw.Draw(img, "RGBA")

    # Dot-grid texture (subtle, schematic feel).
    step = 34
    for gx in range(0, W, step):
        for gy in range(0, H, step):
            draw.ellipse([gx - 1, gy - 1, gx + 1, gy + 1], fill=(255, 255, 255, 10))

    # Diagonal corner accent.
    draw.line([(W - 260, 0), (W, 260)], fill=(*accent, 60), width=2)
    draw.line([(W - 200, 0), (W, 200)], fill=(*accent, 90), width=2)

    # Hero icon badge — dead-centre. See the module docstring for why.
    badge_r = 200
    bx, by = W * 0.5, H * 0.5

    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([bx - badge_r - 40, by - badge_r - 40, bx + badge_r + 40, by + badge_r + 40],
               fill=(*accent, 55))
    halo = halo.filter(ImageFilter.GaussianBlur(45))
    img = Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB")
    draw = ImageDraw.Draw(img, "RGBA")

    draw.ellipse([bx - badge_r, by - badge_r, bx + badge_r, by + badge_r],
                 fill=(27, 26, 24, 255), outline=(*accent, 220), width=6)

    inner = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    idr = ImageDraw.Draw(inner)
    idr.ellipse([bx - badge_r, by - badge_r, bx + badge_r * 0.3, by + badge_r], fill=(*accent, 70))
    inner = inner.filter(ImageFilter.GaussianBlur(50))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse([bx - badge_r, by - badge_r, bx + badge_r, by + badge_r], fill=255)
    img = Image.composite(Image.alpha_composite(img.convert("RGBA"), inner).convert("RGB"), img, mask)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.ellipse([bx - badge_r, by - badge_r, bx + badge_r, by + badge_r],
                 outline=(*accent, 220), width=6)

    icon_font = fa_font(int(badge_r * 1.28), brand=icon_is_brand)
    draw_glyph_centered(draw, bx, by, fa_char(icon_name, fa_map), icon_font, (*TEXT, 255))

    if icon2:
        chip_r = 46
        angle = math.radians(-35)
        chx = bx + math.cos(angle) * (badge_r + 10)
        chy = by + math.sin(angle) * (badge_r + 10)
        draw.ellipse([chx - chip_r, chy - chip_r, chx + chip_r, chy + chip_r], fill=(*accent, 255))
        small_font = fa_font(50, brand=icon2_brand)
        draw_glyph_centered(draw, chx, chy, fa_char(icon2, fa_map), small_font, (22, 21, 20, 255))

    for _ in range(10):
        ang = rnd.uniform(0, 2 * math.pi)
        rad = rnd.uniform(badge_r + 60, badge_r + 150)
        dx, dy = bx + math.cos(ang) * rad, by + math.sin(ang) * rad
        if 0 < dx < W and 0 < dy < H:
            rr = rnd.choice([3, 4, 5, 6])
            draw.ellipse([dx - rr, dy - rr, dx + rr, dy + rr], fill=(*accent, rnd.randint(90, 200)))

    wm_font = dmsans(26, 700)
    tag_font_small = dmsans(19, 600)
    draw.text((56, 50), "SHANI", font=wm_font, fill=ACCENT)
    shani_w = draw.textlength("SHANI", font=wm_font)
    draw.text((56 + shani_w + 10, 54), "BLOG", font=tag_font_small, fill=TEXT_MUTED)

    pill_font = dmsans(22, 700)
    pill_text = tag.upper()
    pad_x = 20
    text_w = draw.textlength(pill_text, font=pill_font)
    pill_w = text_w + pad_x * 2
    pill_h = 42
    pill_x, pill_y = 56, 120
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
                            radius=pill_h // 2, fill=(*accent, 235))
    draw.text((pill_x + pad_x, pill_y + pill_h / 2), pill_text, font=pill_font,
               fill=(22, 21, 20), anchor="lm")

    img.save(out_path, "WEBP", quality=90, method=6)
    return out_path


def get_tag_from_post(slug):
    path = os.path.join(REPO_ROOT, "posts", f"{slug}.md")
    if not os.path.exists(path):
        return None
    raw = open(path, encoding="utf-8").read()
    m = re.search(r"^tag:\s*(.+)$", raw, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip().strip("'\"")


def search_icons(keyword):
    fa_map = _fa_map()
    matches = sorted(k for k in fa_map if keyword.lower() in k.lower())
    if not matches:
        print(f"no bundled icon name contains '{keyword}'")
        return
    for m in matches:
        print(m)


def rebuild_fa_map(css_path, out_path):
    """Rebuild fa_map.json from a Font Awesome all.min.css file — only
    needed if the site's bundled Font Awesome version changes. Fetch the
    matching version's CSS first, e.g.:
        curl -o all.min.css https://cdnjs.cloudflare.com/ajax/libs/font-awesome/<version>/css/all.min.css
    """
    css = open(css_path, encoding="utf-8").read()
    pairs = re.findall(r"\.(fa-[a-z0-9-]+):before\{content:\"\\([a-f0-9]+)\"\}", css)
    d = {}
    for name, code in pairs:
        d.setdefault(name, code)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(d, f)
    print(f"wrote {len(d)} icon mappings to {out_path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", help="post slug — output goes to assets/images/blog/<slug>.webp")
    ap.add_argument("--tag", help="post tag (Guide/Deep Dive/Reference/Ecosystem/Release/Migration/Enterprise). "
                                  "If omitted, read from posts/<slug>.md's own tag: field.")
    ap.add_argument("--icon", help="Font Awesome icon name, e.g. fa-rocket")
    ap.add_argument("--icon-brand", action="store_true", help="pass if --icon is a 'brands' icon (logos)")
    ap.add_argument("--icon2", help="optional second, smaller icon in an orbiting badge")
    ap.add_argument("--icon2-brand", action="store_true", help="pass if --icon2 is a 'brands' icon")
    ap.add_argument("--seed", type=int, default=0, help="random seed for the decorative dot scatter")
    ap.add_argument("--out", help="override the output path (default: assets/images/blog/<slug>.webp)")
    ap.add_argument("--search", metavar="KEYWORD", help="list bundled icon names containing KEYWORD, then exit")
    ap.add_argument("--rebuild-fa-map", metavar="CSS_PATH",
                     help="rebuild fonts/fa_map.json from a Font Awesome all.min.css file, then exit")
    args = ap.parse_args()

    if args.search:
        search_icons(args.search)
        return
    if args.rebuild_fa_map:
        rebuild_fa_map(args.rebuild_fa_map, os.path.join(FONT_DIR, "fa_map.json"))
        return

    if not args.slug or not args.icon:
        ap.error("--slug and --icon are required (unless using --search or --rebuild-fa-map)")

    tag = args.tag or get_tag_from_post(args.slug)
    if not tag:
        ap.error(f"--tag not given and could not read tag: from posts/{args.slug}.md — pass --tag explicitly")

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = args.out or os.path.join(OUT_DIR, f"{args.slug}.webp")
    make_cover(tag, args.icon, args.icon_brand, out_path,
               seed=args.seed, icon2=args.icon2, icon2_brand=args.icon2_brand)
    rel = os.path.relpath(out_path, REPO_ROOT)
    print(f"wrote {rel}")
    print(f"add to posts/{args.slug}.md frontmatter: cover: /{rel}")
    print("then run: node generate-manifest.js")


if __name__ == "__main__":
    main()
