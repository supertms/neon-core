# Neon Core

A futuristic, 16:9 **holographic Codex workspace** prototype designed around a readable central AI core and dense, multi-angle task panels.

## Online demo

**[Open the Neon Core interactive preview](https://supertms.github.io/neon-core/?v=0.2)**

This is a visual prototype driven by **simulated Codex events**, not a live Codex client yet. It does not run arbitrary commands or touch your project files.

## v0.2 — Pixel Genesis

Task panels now have a cyberpunk materialization effect: luminous pixel clusters gather **in place** inside the workspace, a brief scan/decode phase resolves the glass display and its content, and the panel becomes stable and readable. Command, code, analysis and other panels use several related variants rather than the same entrance every time.

The core remains in the center and visually above the panels. The lower workbench can materialize with a separate pixel sweep. Finished panels still retreat, shrink and fade back toward the center; reset preserves this transition.

To compare old and new entrance effects, use **FX: Pixel Genesis / FX: Classic** in the bottom right. Your OS's `prefers-reduced-motion` setting disables complex materialization animations.

## Demo controls

- **Start / Resume** — begin / resume a continuing simulated task stream.
- **Pause** — stop new task events, keep existing panels visible.
- **Inject event** — create one additional task panel.
- **Reset** — animate panels away and return to standby.
- **FX: Pixel Genesis / Classic** — compare entrance treatments for subsequent panels.

## Design invariants

- 16:9-focused desktop interface with deep-navy / electric-cyan color system.
- High-density panels with varied orientation, scale and depth.
- Central geometric AI core remains visible.
- Holographic interfaces assemble inside the scene rather than flying outward.
- Low-key violet folding accents; avoid excessive bloom and noisy persistent effects.
- Panel lifecycle: materialize → decode → operate → retreat → fold → dissolve.

## Development

All files are plain HTML, CSS and JavaScript; no install or bundling required. Open `index.html` in a modern browser or serve the repository directory:

```sh
python -m http.server 4173
```

Then visit <http://127.0.0.1:4173>.

The GitHub Pages deployment workflow automatically publishes `index.html` and the `assets/` directory on pushes to `main`, after a JavaScript syntax check.

## Roadmap

1. Better task-event-driven panel lifecycle, user-adjustable density and animation preferences.
2. Real Codex App Server session, streaming updates and approval UX (desktop/backend bridge).
3. React/TypeScript componentization and spatial 3D engine as appropriate.
4. Desktop packaging and optimization.

**Security note:** The public static preview must not expose local Codex sessions, secrets, or the App Server transport directly to the web.
