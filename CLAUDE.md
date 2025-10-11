# Orchestrator (Bun wrapper for claude-flow)

This project wraps the published `claude-flow` CLI so it can run under Bun and be compiled as a standalone binary. Use `bun run src/main.ts -- <command>` during development, or `bun build src/main.ts --compile --outfile dist/claude-flow --target bun` to produce the binary.
