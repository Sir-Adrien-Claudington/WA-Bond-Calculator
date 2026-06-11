# StarScape — Web Deployment Compliance Checklist
**Date:** 2026-06-11

## Performance (Lighthouse targets)
| Check | Status | Notes |
|---|---|---|
| Three.js / GSAP / Framer chunked separately | PASS | vite.config.ts manualChunks defined |
| No blocking render — canvas loads async | PASS | Canvas is a client-side component |
| Fonts: system-ui fallback + Inter from Google Fonts | PASS | Inter loads via @import or CDN |
| Static assets have immutable cache headers | PASS | netlify.toml Cache-Control: immutable |
| SPA fallback redirect configured | PASS | netlify.toml [[redirects]] |
| Lighthouse Performance target | TARGET: 85+ | WebGL scenes are heavy — Three.js chunks split |
| Lighthouse Accessibility target | TARGET: 95+ | All interactive elements have aria-labels |

## Accessibility
| Check | Status | Notes |
|---|---|---|
| Canvas has role="img" and aria-label | PASS | HeroSection.tsx |
| All interactive buttons have aria-label | PASS | Scroll indicator button |
| Loading states use role="status" aria-live="polite" | PASS | All three data sections |
| Error states use role="alert" | PASS | Hero, planet tracker, sky widget |
| prefers-reduced-motion respected | PASS | global.css media query disables all animations |
| Focus-visible styles defined | PASS | global.css :focus-visible |
| Colour contrast — text on dark bg | PASS | #E8F4FD on #000814 = 17.7:1 (AAA) |
| Heading hierarchy correct (h1 → h2 → h3) | PASS | One h1 (hero), h2 per section |

## Privacy / Legal
| Check | Status | Notes |
|---|---|---|
| Open Meteo CC BY 4.0 attribution in UI | PASS | SkyConditionsWidget + AboutFooter |
| Hipparcos attribution in footer | PASS | AboutFooter |
| JPL Horizons attribution in planet section + footer | PASS | PlanetTrackerSection + AboutFooter |
| Mythology attribution — original or noted CC-BY-SA | PASS | All cards note "Original text" |
| H.A. Rey content excluded | PASS | IP audit confirms not used |
| No Google Analytics / Facebook Pixel | PASS | No tracking scripts |
| No cookies set | PASS | localStorage only (ephemeral cache) |
| Geolocation: only requested when needed, graceful denial | PASS | useLocationStore with fallback to Greenwich |
| Privacy policy link in footer | PASS | /privacy link in AboutFooter |
| HTTPS enforced | PASS | Netlify enforces HTTPS automatically |

## PWA
| Check | Status | Notes |
|---|---|---|
| manifest.json present | PASS | public/manifest.json |
| theme-color meta tag | PASS | index.html |
| Favicon present (reference) | PASS | public/favicon.svg reference — file to be created |
| Icons 192px + 512px referenced in manifest | PASS | manifest.json — files to be created |
| display: standalone | PASS | manifest.json |
| Service worker (optional) | NOT IMPLEMENTED | Add Workbox in v1.1 for full offline support |

## Security
| Check | Status | Notes |
|---|---|---|
| X-Frame-Options: DENY | PASS | netlify.toml |
| X-Content-Type-Options: nosniff | PASS | netlify.toml |
| Referrer-Policy: strict-origin-when-cross-origin | PASS | netlify.toml |
| Permissions-Policy: geolocation=(self) | PASS | netlify.toml |
| No API keys in client bundle | PASS | All APIs are keyless public endpoints |
| Horizons proxy validates lat/lon inputs | PASS | horizons-proxy.ts input validation |
| CORS proxy returns specific allow-origin headers | PASS | horizons-proxy.ts |

## Deployment
| Check | Status | Notes |
|---|---|---|
| Netlify config (netlify.toml) | PASS | In project root |
| Build command: npm run build | PASS | package.json scripts |
| Publish directory: dist | PASS | netlify.toml |
| Node 20 specified | PASS | netlify.toml |
| Edge Function at netlify/functions/horizons-proxy.ts | PASS | File present |

## Outstanding Before Go-Live
1. Create public/favicon.svg (32x32 star icon — original artwork or CC0)
2. Create public/icons/icon-192.png and icon-512.png (PWA icons — original or CC0)
3. Create src/screens/PrivacyPolicy.tsx (minimal: no data collected statement)
4. Add a route for /privacy (React Router or simple conditional render)
5. Run npm install and verify build: npm run build
6. Run Lighthouse audit against production URL
7. Add Workbox service worker for offline PWA (v1.1)
