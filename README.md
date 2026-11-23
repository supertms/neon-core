# Neon Core · Classic Glass / Codex Integration v0.10

**Online preview:** https://supertms.github.io/neon-core/?v=0.8

Neon Core is an experimental **16:9 holographic Codex workspace**. This public site is a visual demo with simulated task events; it does **not** access a user's Codex sessions or execute real commands.

## v0.10 — Real project edits, diff review and explicit permissions

The first practical milestone beyond the read-only v0.9 connection is now implemented in the **local-only** client.

### Working modes

| Mode | What it permits | How to select |
|---|---|---|
| **Read-only (default)** | Analyze the project and run sandbox-constrained read tools without normal file edits | Select **只读分析** |
| **Workspace write (opt-in)** | Modify files only in the selected project via Codex's workspace-write sandbox | Select **允许修改所选项目**, read the confirmation and approve |

For write access, the browser presents a full-path confirmation and sends a separate per-session consent. The local server rejects unsupported modes (including `dangerFullAccess`) and will not switch projects or privileges during an active task.

The server sends `thread/start.sandbox = "readOnly" | "workspaceWrite"`. Every `turn/start` explicitly specifies the corresponding sandbox policy; workspace writes are constrained to the selected canonical folder with `networkAccess: false`, and approvals are `on-request`. Codex can still request approvals to go beyond the default sandbox; **no request is automatically accepted**.

**Important:** `workspaceWrite` is permission to edit that project. Within its sandbox, Codex may make some changes **without a separate approval for each file**. Use a trusted repository, Git and backups; inspect the full diff before keeping changes. This is not an atomic "review all changes before applying" mechanism.

### Real diff viewer and event mapping

When Codex emits `turn/diff/updated`, the local UI creates/updates a **LIVE · CODE DIFF** holographic panel, and **⇄ 查看变更 Diff** opens a scrollable unified diff with green additions, red deletions, and highlighted hunks. File-change items and pending command approvals stay in the event stream. Large diff/output events are clipped to safe display sizes instead of silently disappearing.

The client continues to use the same **Classic Glass** panels and AI cube animations, now driven by real command/file/turn events.

### One-click Windows launcher

After cloning, double-click **`start-neon-core.cmd`** to launch the local bridge and open the browser at **http://127.0.0.1:4173/**. It requires Node.js 20+ and an installed/authenticated Codex CLI, but no app-specific `npm install`. Keep the command window open while using Neon Core.

### Verification

Linux CI tests cover a simulated Codex handshake, read-only turn, explicit write opt-in, diff stream and manual file approval (declined by default). A separate Windows CI job verifies the local server starts and protects the localhost API/token without needing an installed Codex CLI.

**What remains unverified:** a real authenticated Codex App Server handshake on your own Windows PC, and actual patch application inside your chosen repository. This code is **not yet a production-ready desktop app**.

## v0.9 — Real Codex integration (localhost MVP)

There are **two deliberately separate entry points**:

1. **[Public visual demo](https://supertms.github.io/neon-core/)** — always simulated; safely accessible online, no secrets or shell access.
2. **Local real Codex client** — serves the same holographic UI from the user's own machine and starts `codex app-server` using the official JSONL/stdio protocol. It never exposes that RPC service on a public host.

### Windows quick start

Requirements: Node.js **20+**, Git, and an up-to-date Codex CLI. If already installed, skip the install step.

```powershell
npm install -g @openai/codex@latest
codex --version
codex login
git clone https://github.com/supertms/neon-core.git
cd neon-core
npm run local
```

Then open **http://127.0.0.1:4173/**. No `npm install` is required in this project; the local bridge uses Node's standard library.

In the **LIVE CODEX · LOCAL** panel at upper right, enter the **absolute path** of the project you want Codex to inspect (for example `C:\\Projects\\my-app`), click **连接 Codex**, and type an instruction such as `分析这个项目的代码结构，指出最重要的三个潜在问题，不要修改文件`. Click **执行任务**. Code/command/agent events now drive the actual floating panels.

If `codex login` is unavailable or authorization is expired, follow your current Codex CLI's sign-in flow, then restart the bridge. Authentication stays in Codex's local credential store; Neon Core never prompts you to paste an API key into a public page.

### MVP features

- Starts **Codex App Server** locally over stdio; one `initialize` → `initialized` handshake per process.
- Creates a real `thread/start` with `sandbox: "read-only"` and `approvalPolicy: "on-request"`; runs `turn/start` on the selected project.
- Subscribes to actual streamed `item/*`, `turn/*`, command output, and final response events through a local same-origin SSE stream.
- Maps real events into the existing **Classic Glass** holographic panels and central cube pulse/recall choreography. User-controlled injection and mock demo remain available in the public preview.
- Stops a running turn with **中断**.
- Displays pending command/file-change approval requests and only responds after a **real user click** (or declines after a timeout); unknown request types are rejected.
- Browser-to-localhost protection: binds **127.0.0.1** only, checks Host/Origin, rejects non-JSON mutations, requires a randomly generated local session token, does not enable permissive CORS, and never publishes bridge files to GitHub Pages.

### Current boundaries

**This is a source-complete but not yet Windows-verified real-connection MVP.** CI tests verify JSONL framing, the initialize handshake, manual approval behavior, static source isolation, and localhost token/origin security. A real end-to-end test against your installed CLI on Windows is still required before declaring it production-ready.

The first session is **read-only**; Codex may execute tools for reading/analyzing, subject to its sandbox and approval policy, but cannot perform project edits in normal operation. Read-only is not a guarantee of strict per-directory read isolation; only select trusted working directories. Do not accept an approval you do not understand.

The local real mode does not share authentication, conversations, or files with the public GitHub Pages preview. Next milestones: explicit workspace-write permissions, per-command approval UX, thread resume/history, and packaging as an independent Windows desktop application.

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
