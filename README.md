# Neon Core

A dark, immersive 16:9 holographic interface prototype for Codex. The current online experience plays **simulated task events**; it does not yet connect to Codex App Server or execute real commands.

**Live demo:** https://supertms.github.io/neon-core/?v=0.5

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


## v0.5 — Live panel materialization speed

The **入场速度 (Generation speed)** slider in the lower-right control bar adjusts the **Pixel Genesis animation playback rate**, not the task event rate. The setting is saved locally for your next visit.

| Speed | Typical arrival time |
|---|---|
| 0.25× | about 3.7–5 seconds |
| **0.50× (default)** | **about 1.8–2.5 seconds** |
| 0.75× | about 1.2–1.7 seconds |
| 1.00× | about 0.9–1.3 seconds (v0.4 pace) |
| 1.50× | about 0.6–0.9 seconds |
| 2.00× | about 0.45–0.65 seconds |

The slider affects animations **already in progress** on the next frame as well as future panels, so you can compare different speeds without restarting the demo. A light ~30 fps render throttle helps keep the content-driven pixel renderer responsive at low speeds and with overlapping panels. Choosing Classic FX bypasses the pixel speed control.

Motion preferences take precedence: if the system requests reduced motion, complex pixel animations remain disabled.

## Neon Matrix v0.4 — richer pixels, varied assembly

Building on v0.3’s DOM-matched raster snapshot, panel formation now has **six distinctive, content-shaped animations**:

- **Pixel Mosaic** — saturated tiles appear in staggered blocks and subdivide.
- **Scan Decode** — sweeping, high-contrast chromatic scan reveals the actual panel.
- **Slice Assembly** — displaced horizontal slices align with their original pixel locations.
- **Voxel Bloom** — panel-shaped voxels expand outward locally, then flatten into glass.
- **Glitch Rebuild** — restrained, banded digital misalignment with violet/pink highlights.
- **Node Lattice** — a glowing scaffold resolves into the panel’s own text, graph and borders.

The engine favors modes that suit the panel content but avoids repeating either of the last two modes. Timing varies slightly. **The animation pixels still originate from the actual rendered panel**, so command text, red/green diff lines and status icons end up in the right place.

The default **Color: Hybrid** setting features bright electric cyan, cobalt, violet, magenta, rose, orchid, orange and small gold highlights while constructing a panel, then returns to a readable deep-navy holographic screen. Click **Color: Hybrid** to cycle to **Neon Matrix** (more saturated) or **Classic** (more restrained). The palette setting affects newly spawned panels only.

Controls: **FX: 6 Spawn Modes** toggles the animation vs classic entrance; **Inject event** creates a new panel; **Pause/Reset** manage the demo loop. The status caption names the last chosen spawn mode.

The interface remains optimized for a 16:9 desktop viewport with a protected central AI core and layered workbench. All task data in this preview remains simulated.

## Source and delivery

No dependency installation is required for the static demo. Serve the repository root:

```bash
python -m http.server 4173
```

Then open http://127.0.0.1:4173.

Pushes to `main` trigger a GitHub Actions workflow that validates JavaScript syntax and deploys the HTML and asset files to GitHub Pages.

## Next

Iterate against actual browser feedback on pixel fidelity and motion cadence; then design a secure local/desktop bridge for real Codex App Server events.
