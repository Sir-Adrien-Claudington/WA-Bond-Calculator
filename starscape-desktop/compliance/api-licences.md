# StarScape — API Licence Reference

## Open Meteo
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Licence URL:** https://creativecommons.org/licenses/by/4.0/
- **Commercial use:** Permitted
- **Attribution required:** YES — in UI and documentation
- **Attribution string used:** "Weather data by Open Meteo (open-meteo.com), licensed under CC BY 4.0"
- **API endpoint:** https://api.open-meteo.com/v1/forecast
- **API key required:** No
- **CORS support:** Yes — browser-safe
- **Rate limits:** Generous free tier, no registration needed

## JPL Horizons (NASA/JPL-Caltech)
- **Licence:** US federal government work — public domain (17 U.S.C. § 105)
- **Commercial use:** Permitted (public domain)
- **Attribution required:** Recommended (not legally required)
- **Attribution string used:** "Planet ephemeris: JPL Horizons (NASA/JPL-Caltech), public domain"
- **API endpoint:** https://ssd.jpl.nasa.gov/horizons_batch.cgi
- **API key required:** No
- **CORS support:** NO — proxied via Netlify Edge Function
- **Rate limits:** Reasonable use expected; sequential per-body requests implemented

## ESA Hipparcos Catalogue
- **Licence:** Public domain (ESA, 1997)
- **Commercial use:** Permitted (public domain)
- **Attribution required:** Recommended
- **Attribution string used:** "Star data: ESA Hipparcos Catalogue (1997), public domain"
- **Data source:** Bundled static JSON — no network request
- **File:** assets/data/hipparcos_bright.json (187 bright stars, vmag ≤ 6.5)
