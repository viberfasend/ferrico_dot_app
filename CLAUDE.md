# Ferrico

A local-first bookmark manager. **Tauri 2 + React 19 + TypeScript + Tailwind CSS 4**,
targeting desktop (macOS/Linux/Windows) and Android. Bookmarks live in local SQLite;
sync across devices via the user's own Neon/Postgres database (Google Drive as a
manual backup fallback); an AI panel powered by the local `claude` CLI; and a
companion browser extension.

Contributor docs live in `docs/` (e.g. `neon-sync.md`, `google-drive-backup.md`).

## Running the app

Node 24+ is required — the Tauri CLI uses optional chaining that breaks on older Node.

```bash
nvm use              # switches to Node 24 (see .nvmrc)
source ~/.cargo/env  # if cargo isn't already on PATH
bun tauri dev        # starts Vite + the Tauri desktop app
```

## Development workflow

- **Always work in a git worktree** under `.claude/worktrees/<branch-name>` — never as a
  direct child of `~/dev` or a sibling of the project. Remove the worktree once the PR is
  open and pushed; the branch then lives normally on `origin`.

  ```bash
  git worktree add .claude/worktrees/<branch> -b <branch>   # start
  git worktree remove .claude/worktrees/<branch>            # once PR is open
  ```
- Commit/push only when asked. End commit messages with the `Co-Authored-By` trailer.

## Platform notes

- **Data dir** (`dirs::data_dir()`): macOS `~/Library/Application Support/ferrico/ferrico.db`,
  Linux `~/.local/share/ferrico/ferrico.db`. `settings.json` sits beside the DB.
- **cargo**: the rustup toolchain, not the `snap` package. `/snap/bin/cargo` is often an
  older pinned version that can't read a current-format `Cargo.lock` — if plain `cargo`
  errors on the lockfile, prepend the rustup toolchain explicitly:
  `export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"`.
- **iOS**: blocked here — needs macOS 13+ and Xcode 15.3.
- **Android**: one-time toolchain/emulator setup is in the `android-setup` skill
  (`.claude/skills/android-setup/SKILL.md`).

## Tauri config notes

- `beforeDevCommand` is `bun run dev` (Vite only, not Tauri — avoids an infinite loop).
