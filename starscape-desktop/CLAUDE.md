# StarScape — Desktop Web App

## Identity
- **App name:** StarScape
- **Version:** 1.0.0
- **Platform:** Desktop web (React 18 + Vite + TypeScript)
- **Repurposed from:** ConstellationMap (React Native, appforge-constellationmap/)

## Architecture
- Framework: React 18 + Vite 5
- Language: TypeScript (strict)
- State: Zustand stores in src/store/
- Cache: localStorage (replaces MMKV from mobile version), TTL-based, namespaced "starscape:"
- 3D rendering: Three.js r165 via @react-three/fiber + @react-three/drei
- Scroll animation: GSAP 3 + ScrollTrigger
- UI transitions: Framer Motion
- Deployment: Netlify (netlify.toml configured)

## IP Rules — MUST follow (identical to mobile version)
- Constellation line art: procedurally generated from Hipparcos RA/Dec — NEVER copied from Stellarium, Sky Map, or any atlas
- Mythology text: original writing — NEVER from H.A. Rey "The Stars" (in copyright)
- Open Meteo: CC-BY 4.0 — attribution MUST appear in SkyConditionsWidget AND AboutFooter
- Hipparcos: public domain, bundled as static JSON — safe to ship

## Key APIs
| API | Endpoint | Key Required | CORS | Notes |
|---|---|---|---|---|
| Open Meteo | api.open-meteo.com/v1/forecast | No | YES | CC-BY 4.0 |
| JPL Horizons | via /.netlify/functions/horizons-proxy | No | via proxy | PD, no native CORS |
| Hipparcos | bundled JSON | N/A | N/A | 187 bright stars |

## CORS Issue — JPL Horizons
ssd.jpl.nasa.gov has no Access-Control-Allow-Origin header. Direct browser fetch is blocked.
Solution: Netlify Edge Function at netlify/functions/horizons-proxy.ts proxies server-side.
In local dev (npm run dev), the proxy is unavailable — planet tracker shows error state.
To test locally: run `netlify dev` instead of `npm run dev`.

## Dev Commands
```bash
npm install           # Install dependencies
npm run dev           # Vite dev server (no proxy — planet tracker in error state)
netlify dev           # Full local dev including Edge Functions (planet tracker works)
npm run build         # TypeScript check + Vite build → dist/
npm run typecheck     # tsc --noEmit
npm run preview       # Preview production build locally
```

## File Structure
```
starscape-desktop/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── netlify.toml
├── src/
│   ├── api/           # hipparcos.ts, horizons.ts, openMeteo.ts, cache.ts, types.ts
│   ├── scenes/        # Three.js scenes (StarField.tsx, PlanetTracker.tsx)
│   ├── screens/       # React sections (HeroSection, ConstellationJourney, etc.)
│   ├── store/         # Zustand stores
│   ├── constants/     # config.ts, endpoints.ts, theme.ts
│   ├── styles/        # global.css
│   ├── App.tsx
│   └── main.tsx
├── assets/data/       # hipparcos_bright.json (187 stars, copied from mobile project)
├── netlify/functions/ # horizons-proxy.ts (CORS proxy for JPL Horizons)
├── public/            # index.html, manifest.json, favicon.svg (to create), icons/ (to create)
├── compliance/        # ip-audit.md, api-licences.md
└── web-assets/        # web-checklist.md, metadata.md
```

## Security Rules
- **No hardcoded credentials** — all secrets via `process.env.*` (Netlify env vars). Never commit `.env`.
- **No silent catch blocks** — every `catch` must either log the error or rethrow. Silent `catch {}` hides bugs.
- **No `innerHTML` / `dangerouslySetInnerHTML`** — all dynamic content must go through React's JSX escaped output.
- **No `eval` / `new Function`** — prohibited unconditionally.
- **Proxy origin gate** — `ALLOWED_ORIGIN` env var must be set in Netlify before going live. Wildcard CORS (`*`) is dev-only.
- **Attribution is legally required** — Open Meteo CC BY 4.0 strings must always appear in `SkyConditionsWidget` and `AboutFooter`. Do not remove them.

## Cosmos Explorer Views (added 2026-06-12)
Three additional views integrated from the Cosmos Explorer concept (adapted from
Electron to web — no Electron code):
- `/explorer` — interactive 3D solar system: Three.js WebGLRenderer + CSS3DRenderer
  floating HTML data panels, custom spherical orbit controls, raycast click-select,
  bottom pill nav. Panels built with DOM APIs (no innerHTML, per security rules).
- `/dashboard` — live planet/Moon altitude, azimuth, distance, illumination,
  rise/set — computed locally via `astronomy-engine` (MIT). No network calls.
- `/journey` — pure CSS scroll-driven planet tour using `animation-timeline: view()`,
  zero JS scroll listeners. Graceful fallback in non-supporting browsers.
Keyboard shortcuts: E / D / J switch views, Escape returns home.
Fonts: Space Grotesk + JetBrains Mono self-hosted via @fontsource (latin subset only —
Google Fonts CDN is blocked by CSP). Data: `src/data/planets.ts` (public facts).

## Outstanding Before Go-Live
All pre-launch items complete. App is live at https://starscape-desktop.netlify.app.
Lighthouse scores: Performance 95, Accessibility 96, Best Practices 88, SEO 91.

## Star Count Discrepancy (resolved)
The mobile app's CLAUDE.md says "118,218 stars" — this refers to the full Hipparcos catalogue.
The bundled JSON (hipparcos_bright.json) contains exactly **187 bright stars** (verified 2026-06-11).
StarScape desktop uses all 187. No magnitude paywall on web.
