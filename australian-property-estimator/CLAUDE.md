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
