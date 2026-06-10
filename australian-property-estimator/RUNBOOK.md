# NewGearing — Runbook

## Post-Deploy Smoke Test

After every Railway deployment:

1. Open https://www.newgearing.xyz in an incognito window
2. Enter a property purchase price in any state and confirm stamp duty output is numeric
3. Switch between states — confirm each produces a result
4. Toggle the gearing scenario — confirm the chart renders
5. Click the Share URL button — paste the URL in a new tab and confirm the values round-trip
6. Check browser console for CSP violations (should be zero)

## Rollback Procedure

1. Go to Railway → your project → Deployments tab
2. Find the last known-good deployment
3. Click the three-dot menu → Redeploy
4. Railway keeps the last 20 deployments

## Performance Targets

- LCP: < 2.5s on 3G (main constraint is Chart.js ~200KB, already self-hosted)
- No external network requests at runtime (verify via Network tab in DevTools)

## Known Gaps

- Tax rates for NSW, VIC, QLD, WA, SA, TAS have `verify: true` in `data/stamp-duty-rates.js` — these are indicative and should be verified against each state's revenue office before each tax year
- No CI pipeline — tests and Docker build must be run locally before each deploy

## Uptime Monitoring

Register https://www.newgearing.xyz in UptimeRobot (free tier, 5-minute interval) if not already done.

## GitHub Branch Protection

Enable in GitHub → repo → Settings → Branches → Add rule for `master`:
- Require a pull request before merging
- Require status checks to pass (once CI exists)
- Disallow direct push to master
