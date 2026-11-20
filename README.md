# Neon Core

A browser-based, 16:9 holographic Codex workspace prototype.

## Online preview

After GitHub Pages is enabled and the first deployment succeeds, the preview will be available at:

<https://supertms.github.io/neon-core/>

## Run locally

No build tools or dependencies are required. Open `index.html` directly in a modern browser, or serve this folder:

```bash
python -m http.server 4173
```

Then open <http://127.0.0.1:4173>.

## Demo controls

- **Start / Resume**: continuously spawns simulated Codex task panels.
- **Pause**: freezes the event stream while leaving current panels visible.
- **Inject event**: spawns one additional task panel.
- **Reset**: folds panels back toward the central core and returns to standby.

## Visual system

- 16:9 workspace shell with navigation, sidebar, and system status.
- Central AI core with nested cube geometry and rotating halos.
- Recursive spatial frames, floor grid, and restrained blue / violet light ribbons.
- Dense, multi-angle holographic panels and a lower horizontal workbench.
- Panel lifecycle: materialize → unfold → active → retreat → fold → dissolve.
- Responsive visual layout designed for desktop browser testing.

## Integration status

This is a visual prototype. Codex events are simulated; it does not yet connect to a real Codex App Server session or access project files. Real session integration is planned for a later phase.
