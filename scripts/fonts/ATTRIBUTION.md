# Bundled fonts

Used only by `../generate-cover.py` at build time — never shipped to the
live site (which loads its own copies of Playfair Display/DM Sans from
Google Fonts and Font Awesome from cdnjs, per `index.html`).

- **playfair.ttf** — Playfair Display (variable, all weights), SIL Open
  Font License 1.1. Source: `github.com/google/fonts/ofl/playfairdisplay`.
- **dmsans.ttf** — DM Sans (variable, all weights + optical sizes), SIL
  Open Font License 1.1. Source: `github.com/google/fonts/ofl/dmsans`.
- **fa-solid.ttf**, **fa-brands.ttf** — Font Awesome 6.5.0 Free, fonts
  licensed SIL OFL 1.1, icons licensed CC BY 4.0. Source: the same
  `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/` build
  already used site-wide (see `index.html`'s `<link>`/`<script>` tags).
- **fa_map.json** — icon-name → Unicode-codepoint table, mechanically
  extracted from Font Awesome 6.5.0's own `all.min.css` (every
  `.fa-name:before{content:"\XXXX"}` rule). Rebuild with
  `generate-cover.py --rebuild-fa-map <path-to-all.min.css>` if the site's
  Font Awesome version ever changes.
