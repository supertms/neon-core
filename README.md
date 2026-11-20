# Neon Core

A 16:9 holographic Codex workspace prototype. This first web build validates the visual system and task-panel lifecycle before connecting a real Codex App Server session.

## Run locally

Requires Node.js 18+.

```bash
npm run dev
```

Open http://127.0.0.1:4173. No dependency installation is required.

## Demo controls

- Start / Resume: continuously spawns simulated Codex task panels.
- Pause: freezes the event stream while leaving current panels visible.
- Inject event: spawns one additional task panel.
- Reset: folds panels back toward the central core and returns to standby.

## Prototype features

- 16:9 workspace shell with navigation and system status.
- Central AI core with nested cube geometry and rotating halos.
- Recursive space frames, floor grid, and restrained blue / violet light ribbons.
- Multi-angle holographic panels: task, plan, command log, code diff, project files, tests, analysis, and metrics.
- Lower horizontal workbench panels.
- Panel lifecycle: materialize → unfold → active → retreat → fold → dissolve.
- Simulated task events only; real Codex integration is planned for a later phase.

## Deployment

The project is configured for GitHub Pages deployment from the `main` branch using GitHub Actions. The online preview will be available at https://supertms.github.io/neon-core/ after the first successful deployment.
