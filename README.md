# Neon Core

A dark, immersive 16:9 holographic interface prototype for Codex. The current online experience plays **simulated task events**; it does not yet connect to Codex App Server or execute real commands.

**Live demo:** https://supertms.github.io/neon-core/?v=0.3

## Pixel Genesis v0.3 — content-matched reconstruction

The former v0.2 animation scattered unrelated cyan/purple pixels over panels. v0.3 replaces that effect with a **rasterization of each actual task panel**:

1. Render a clean offscreen clone of the specific panel, including its final layout, text, icons, code diff colors, checks, graphs, and border.
2. Convert that picture into a temporary canvas; render pixel cells at the *same positions and colors* as the content.
3. Gradually reconstruct the panel from 14px blocks to 9px, 5px, 3px and finally fine pixels, with each cell appearing according to a content-aware progression.
4. Reveal the original accessible, interactive HTML panel as the generated image resolves to full fidelity.
5. When finished, preserve the existing retreat / shrink / fade toward the core.

No separate random-colored decoration is placed over unrelated content. Variations only affect **when real pixels appear**: command panels scan vertically, code and file panels fill laterally, test panels progress across their contents.

The primary snapshot path uses built-in SVG `foreignObject` with computed DOM styles; a structural Canvas2D drawing of the panel's actual DOM serves as a fallback when a browser cannot draw the SVG. There is no CDN dependency.

### Try it

Use **FX: Raster Genesis / FX: Classic** at the bottom right of the online demo to switch the *next spawned panels* between pixel reconstruction and conventional entrances. **Inject event** spawns an additional panel for inspection; **Reset** returns to idle.

Desktop browsers are recommended. The operating system's reduced-motion preference disables complex animation. No real local code, repository secrets, or commands are exposed by this static site.

## What stays the same

- 16:9 shell and deep-navy / ice-blue / restrained-purple styling.
- Dense floating holographic panels with varied angles and depths.
- Center AI core remains in view; panels generate within the space rather than being fired out of it.
- Lower horizontal workbench.
- Panels return toward the core during their existing exit animation.

## Source and delivery

No dependency installation is required for the static demo. Serve the repository root:

```bash
python -m http.server 4173
```

Then open http://127.0.0.1:4173.

Pushes to `main` trigger a GitHub Actions workflow that validates JavaScript syntax and deploys the HTML and asset files to GitHub Pages.

## Next

Iterate against actual browser feedback on pixel fidelity and motion cadence; then design a secure local/desktop bridge for real Codex App Server events.
