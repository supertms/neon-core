# Neon Core · Classic Glass v0.6

**Online preview:** https://supertms.github.io/neon-core/?v=0.6

Neon Core is an experimental **16:9 holographic Codex workspace**. This public site is a visual demo with simulated task events; it does **not** access a user's Codex sessions or execute real commands.

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
