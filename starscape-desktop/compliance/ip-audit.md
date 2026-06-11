# StarScape — IP Audit
**Date:** 2026-06-11
**Project:** StarScape Desktop Web App
**Auditor:** AppForge automated pipeline

Every asset, API, font, algorithm, and third-party library is listed here.
No asset may be shipped if its rating is RESTRICTED or HIGH RISK.

---

## Libraries

| Library | Version | Licence | Commercial Use | Attribution Required | Share-Alike | Rating |
|---|---|---|---|---|---|---|
| Three.js | r165 | MIT | YES | No | No | CLEAR |
| @react-three/fiber | 8.x | MIT | YES | No | No | CLEAR |
| @react-three/drei | 9.x | MIT | YES | No | No | CLEAR |
| GSAP 3 | 3.12.x | Standard No Charge (Webflow, 2025-04-30) | YES | No | No | CLEAR |
| GSAP ScrollTrigger | 3.12.x | Standard No Charge (Webflow, 2025-04-30) | YES | No | No | CLEAR |
| Framer Motion | 11.x | MIT | YES | No | No | CLEAR |
| React 18 | 18.3.x | MIT | YES | No | No | CLEAR |
| React DOM | 18.3.x | MIT | YES | No | No | CLEAR |
| Vite 5 | 5.x | MIT | YES | No | No | CLEAR |
| Zustand | 4.x | MIT | YES | No | No | CLEAR |
| TypeScript | 5.x | Apache 2.0 | YES | No | No | CLEAR |

**GSAP Note:** Licence verified 2026-06-11 at gsap.com/licensing. "Standard No Charge License" effective 2025-04-30. Free for all commercial projects. Only restriction: cannot build a competing no-code visual animation platform (not applicable here).

---

## Data Sources

| Source | Licence | Commercial Use | Attribution Required | In-App Attribution | Rating |
|---|---|---|---|---|---|
| Hipparcos Star Catalogue (ESA, 1997) | Public domain | YES | Recommended | YES — footer | CLEAR |
| JPL Horizons (NASA/JPL-Caltech) | US federal PD (17 U.S.C. § 105) | YES | Recommended | YES — planet section + footer | CLEAR |
| Open Meteo | CC BY 4.0 | YES | **LEGALLY REQUIRED** | YES — widget + footer | CAUTION (attribution obligation met) |

**JPL Horizons CORS Note:** ssd.jpl.nasa.gov returns no Access-Control-Allow-Origin header. Direct browser fetch blocked. Resolved via Netlify Edge Function at `netlify/functions/horizons-proxy.ts`. The proxy does not alter the data — it is a pass-through. No additional IP liability.

---

## Fonts

| Font | Licence | Commercial Use | Source |
|---|---|---|---|
| Inter | OFL 1.1 | YES | Google Fonts |
| System UI fallback | N/A — OS system font | YES | N/A |

---

## Imagery / Icons

| Asset | Source | Licence | Rating |
|---|---|---|---|
| Planet unicode symbols (☿ ♀ ♂ ♃ ♄ ☽) | Unicode standard | Public domain | CLEAR |
| SVG constellation line art | Procedurally generated from Hipparcos RA/Dec coordinates | N/A — original work | CLEAR |
| No raster images used | — | — | — |

**Constellation line art rule:** All stick figures are computed from Hipparcos RA/Dec coordinates. No line art is copied from Stellarium, Sky Map, H.A. Rey, or any other copyrighted atlas. This rule is identical to the mobile app's rule.

---

## Text Content

| Content | Source | Licence | Attribution Required | Rating |
|---|---|---|---|---|
| Constellation mythology (Orion, UMa, Sco, Cyg, Leo) | Original writing, inspired by IAU and public-domain sources | N/A — original | No | CLEAR |
| H.A. Rey "The Stars" mythology | NOT USED — in copyright | — | — | PROHIBITED |

**Note:** H.A. Rey's specific phrasing and stick-figure designs from "The Stars: A New Way to See Them" are protected by copyright. All mythology text in this app is original. Wikipedia CC-BY-SA text may be added in future versions provided each card displays the attribution note "Source: Wikipedia, CC BY-SA 4.0".

---

## Algorithms

| Algorithm | Source | Patent Risk | Rating |
|---|---|---|---|
| RA/Dec → Cartesian conversion | Standard spherical trigonometry (textbook math) | None | CLEAR |
| B-V → RGB star colour | Standard stellar spectral class approximation | None | CLEAR |
| Limiting magnitude from cloud cover | Simplified Bortle scale approximation (original formula) | None | CLEAR |
| GSAP ScrollTrigger scroll binding | GSAP library API usage | None | CLEAR |

---

## Summary

- All libraries: CLEAR
- All data sources: CLEAR (Open Meteo attribution obligation MET in footer and widget)
- All fonts: CLEAR
- All imagery: CLEAR (procedurally generated)
- All text: CLEAR (original writing)
- All algorithms: CLEAR (standard math, no patents)

**No RESTRICTED or HIGH RISK items. Pipeline may proceed to PACKAGE.**
