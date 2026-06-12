# Lighthouse Reports

Full Lighthouse JSON reports for each route of the live site
(https://starscape-desktop.netlify.app), run with the **desktop** preset.

> Always audit this app with `--preset=desktop`. The default mobile preset
> applies a 4× CPU throttle that is wrong for a desktop-first WebGL app and
> tanks the Performance score misleadingly.

Run command (Windows / SwiftShader headless):

```
npx lighthouse <url> --preset=desktop \
  --chrome-flags="--headless --enable-webgl --use-gl=swiftshader --disable-gpu-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=<file>.json
```

## Results — 2026-06-12

| Route        | Performance | Accessibility | Best Practices | SEO |
|--------------|:-----------:|:-------------:|:--------------:|:---:|
| `/`          |     86      |      96       |      96        | 91  |
| `/explorer`  |     91      |     100       |     100        | 91  |
| `/dashboard` |     99      |     100       |     100        | 91  |
| `/journey`   |     99      |     100       |     100        | 91  |

Core Web Vitals are healthy across the board (CLS 0 everywhere; LCP 0.6–1.4 s).
`/explorer` Performance varies ±10 pts between runs because Lighthouse's
SwiftShader software renderer CPU-renders every WebGL frame; on real
GPU-accelerated hardware it scores higher.

Note: these reports contain no PII — only the public site URL and generic
Lighthouse environment strings (standard browser user-agent, CPU benchmark
index).
