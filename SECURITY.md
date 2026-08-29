# Security Policy

## Trust Model

`shani-blog` is a no-build-step static SPA (`blog.shani.dev`) with two real
attack surfaces for "just a blog":

- **Members-only paywall** backed by Razorpay. The paywall decides which DOM
  blocks to render; the full Markdown content is served publicly at
  `/posts/<slug>.md`. This is a deliberate content-generation-time limitation,
  not a server-enforced restriction — see Known Limitations.
- **Admin panel** (`admin.html`) holds a live GitHub write token (stored in
  `sessionStorage`, cleared on logout) for on-site content editing. A
  compromised token can push malicious content to the blog and, via the
  GitHub PAT, access the owner's other repositories.

## Key Security Mechanisms

| Mechanism | Implementation |
|-----------|----------------|
| GitHub PAT storage | `sessionStorage` (not `localStorage`); cleared on logout (`admin.html`) |
| Paywall | Razorpay-backed; license-key verification via SHA-256 hash JSON (`config-shani.js`) |
| Content rendering | DOMPurify pass on markdown renderer output (`utils.js`) |
| CDN integrity | SRI `integrity=` hashes on external CDN `<script>`/`<link>` tags |

## Known Limitations

- **Paywall is cosmetic.** Full paid content is served publicly at unauthenticated paths (`/posts/<slug>.md`). The paywall only decides what to *display*. This is a known architectural limitation — true content protection requires a server-side access control layer that a static GitHub Pages site cannot enforce.
- **Client-side XSS surface.** The markdown renderer in `utils.js` builds HTML from unescaped `href`/`src`/`title`/`alt` before DOMPurify. Renderer output must always pass through DOMPurify before DOM insertion.

## Reporting a Vulnerability

If you discover a security vulnerability in any Shanios project, please report it
responsibly by opening a private security advisory on GitHub.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 72 hours and provide a detailed response
within 7 days. Thank you for helping keep Shanios secure.
