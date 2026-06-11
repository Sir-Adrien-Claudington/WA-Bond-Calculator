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

## Outstanding Before Go-Live
1. npm install (dependencies not yet installed)
2. Create public/favicon.svg (original star icon, or CC0 source)
3. Create public/icons/icon-192.png + icon-512.png (PWA icons, CC0)
4. Create src/screens/PrivacyPolicy.tsx + wire /privacy route
5. npm run build — verify zero TypeScript errors
6. Deploy to Netlify and run Lighthouse audit (target: 85+ Performance, 95+ Accessibility)
7. Optional v1.1: Workbox service worker for offline PWA

## Star Count Discrepancy (resolved)
The mobile app's CLAUDE.md says "118,218 stars" — this refers to the full Hipparcos catalogue.
The bundled JSON (hipparcos_bright.json) contains exactly **187 bright stars** (verified 2026-06-11).
StarScape desktop uses all 187. No magnitude paywall on web.
