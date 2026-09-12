---
name: readme-screenshot
description: Rebuilds docs/interface.png from the demo catalog in src/domain/demo.ts. Use when the user asks to regenerate the README image or after a user-visible UI change that the README still shows.
---

# README screenshot

The catalog already lives in `src/domain/demo.ts`. Do not invent machines, slugs, folders, or chat lines. Do not rewrite that file unless the user changes it first.

Write `docs/interface.png` from that catalog:

```
bun test src/domain
bun run screenshot
```

`--demo` and `--screenshot` skip SSH and open `DEMO_SCENE`. Do not capture `bun run dev`. That window lists live machines.

The command must print `wrote …/docs/interface.png` and exit 0.

The README already embeds this image:

```
![Diodati lists sample machines and a Shelley thread](docs/interface.png)
```

Paper, preview closed, terminal closed. Do not add a second image. Do not commit unless the user asks.
