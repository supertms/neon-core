# Neon Core · Classic Glass v0.8

**Online preview:** https://supertms.github.io/neon-core/?v=0.8

Neon Core is an experimental **16:9 holographic Codex workspace**. This public site is a visual demo with simulated task events; it does **not** access a user's Codex sessions or execute real commands.

## v0.8 — Event-driven AI cube motion

The approved Classic Glass UI remains intact. The **central nested holographic cube** now reacts to the two real panel lifecycle transitions in the demo.

**1. Cube awaken / panel emergence**
- When a command/task/code panel is spawned, the inner cube briefly brightens and expands slightly.
- Outer edge lines and a faint isometric resonance outline pulse outward inside the cube.
- A thin curved locator signal briefly connects the cube to the panel's actual on-screen position as the panel materializes in place.
- There is no flying panel projectile, repeated glitch, or full-screen particle burst.

**2. Magnetic recall / panel absorption**
- Before a completed panel retreats, the renderer captures its displayed position.
- The panel keeps its existing gentle CSS retreat toward the center. Meanwhile a violet-to-cyan light trace travels back along a curved path toward the cube.
- The middle cube contracts softly and the inner cube receives a restrained flash as the trace reaches the core.
- The cube settles back into its quiet standby state.

**Hands-on controls:** **+ 核心唤醒** adds a panel and triggers phase 1; **↙ 吸附回收** sends the most recently active panel back and triggers phase 2. The existing **Start demo**, **Pause**, **Inject event**, and **Reset** controls also work. Effects respect the operating system's reduced-motion setting.

Implementation: SVG/core keyframe rules in `assets/core-motion.css` plus event-triggered spline light paths in `assets/core-motion.js`. Filament count is capped to avoid visual overload; temporary SVG nodes and animation frames are removed after each transition.

## v0.7 — Reference-style layered glass borders

This iteration concentrates on the user's **two border reference details**, without changing the accepted Classic motion:

- **Volumetric (thick) rims** for the main Task, Code, File and Command panels: rounded cyan outer border, luminous beveled left/top strips, a recessed second contour, soft external bloom and transparent navy glass filling.
- **Thin gradient rims** for supportive panels and the five lower status cards: cyan/ice-blue on the upper-left edge transitioning through blue to violet on the lower-right, with subtle corner glow.
- **Angled workbench panels** gain medium-weight illuminated edges; distant micro panels get a muted thin gradient to preserve hierarchy.
- Pure CSS gradients, inner bevels and shadow layers. Text and controls remain real HTML; there is no static screenshot substitution.
- All panel lifecycle behavior remains unchanged: soft Classic entrance and slow retreat back toward the central nested cube.

The new rules are kept in `assets/neon-rims.css`, loaded **after** `assets/neon-classic.css` so their style hierarchy can be adjusted independently.

This is a browser approximation of the reference's cinematic glass thickness. It is not physically ray-traced transparent glass.

## Design direction

The new v0.6 returns to the restrained **Classic** entrance that felt better during review. The animated pixelization variants and their speed/palette controls are removed from the live interface.

The interface is now modeled after the approved reference concept:

- **Central AI core:** a large translucent **nested holographic cube** with an inner luminous cube, multi-layer wireframes and a restrained cyan beam. No animated spherical energy core.
- **Glass panel style:** beveled-looking cyan-to-violet gradient borders, soft rim glow, dark translucent glass surfaces and subtle reflections.
- **Full layout:** a clear Codex / Codex Workspace header, sidebar with a New Task demo button, layered left/right/overhead panels, lower horizontal holographic workbench and **five wide status instruments** below.
- **Motion:** classic soft unfold/fade; finished panels slowly shrink, retreat and fade toward the center, without covering the central cube.
- **Density:** dynamically repeating simulated task events with up to nine primary panels plus smaller background panels; the central area is protected by composition and depth.

This is an editable CSS/SVG/HTML implementation, **not** the original concept image embedded as a static screenshot. Fidelity will be iterated on against desktop browser captures.

## Demo interactions

- **Start demo:** resume the event feed.
- **Pause:** stop new panel creation.
- **Inject event:** manually spawn a panel to inspect the entry motion.
- **Reset:** animate the existing panels back to the central area.
- **New Task** (sidebar): add a simulated task panel.

## Source & deployment

Only `index.html` and `assets/neon-classic.css` are required by the published preview. Legacy Pixel Genesis experiments remain available in Git history but are no longer loaded on the website.

To run locally, serve the repository root:

```sh
python -m http.server 4173
```

Then open http://127.0.0.1:4173.

Pushes to `main` trigger GitHub Actions syntax/structure checks and deploy the static preview to GitHub Pages.

## Future

Next will be in-browser visual review and layout polish, followed by a secured local desktop bridge to Codex App Server (live task events and approvals). The demo dashboard numbers are illustrative and are not actual system metrics.
