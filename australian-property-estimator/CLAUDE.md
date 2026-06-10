# NewGearing — AI Context

## Architecture

Purely static SPA (vanilla JS, no framework, no build step). nginx alpine on Railway. No backend, no database, no user accounts.

## Security Rules

- CSP must stay `script-src 'self'` — never add `unsafe-eval` or `unsafe-inline`
- All `innerHTML` assignments must only write output from `fmtMoney()` or hardcoded HTML — never raw user input or URL params
- Never use `eval()` or `new Function()`
- No external runtime network requests — `connect-src 'none'` in CSP must remain
- Never write empty `catch {}` blocks

## File Structure

- `app.js` — main application logic and event handlers
- `modules/` — pure calculation modules (stamp-duty, land-tax, negative-gearing, etc.)
- `data/` — tax rate tables per state/territory
- `nginx.conf.template` — nginx server block with security headers and $PORT substitution
- `nginx-http.conf` — http-level nginx config (log format, rate limiting)

## Tax Rate Tables

Files in `data/` with `verify: true` flag have indicative rates that must be verified against each state's revenue office before each financial year. Do not change these rates without citing the source.

## Done Criteria

A change is done when:
- No `eval`, `document.write`, or unguarded `innerHTML` with user data is present
- `nginx -t` passes on the updated config
- The post-deploy smoke test in RUNBOOK.md passes

## Known Failure Modes

| Failure | Symptom | Recovery |
|---------|---------|----------|
| Railway deploy fails (nginx config parse error) | Site returns 502 or stays on old deploy | Fix `nginx.conf.template` syntax, push a new commit; Railway re-deploys automatically |
| Stale data/stamp-duty-rates.js after financial year | Calculator returns wrong duty for a state | Update the affected rate table in `data/`, cite source URL, bump `lastVerified` date, push |
| CSP header missing after nginx change | Browser console logs CSP violations | Check `nginx.conf.template` — each `location` block that defines its own `add_header` must repeat all security headers (nginx does not inherit `add_header` across blocks) |
| Port binding failure on Railway | Container exits immediately at start | Ensure `nginx.conf.template` uses `$PORT` (not a hardcoded port); Railway sets this env var at runtime |
| JS/CSS served stale after deploy | Users see old layout/logic | Files have a 1-day cache TTL. If a hot-fix is critical, append `?v=<timestamp>` to the script/link tags in `index.html` as a manual cache-bust |
