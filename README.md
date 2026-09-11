# Exevibe

Desktop client for exe.dev machines and the Shelley agent that runs on each machine.

The app lists machines with `ssh exe.dev ls --json`. It lists and drives Shelley threads through SSH to that machine's Shelley unix socket. It uses the SSH keys already on this computer.

## Run

```
bun install
bun test
bun run dev
```

## Layout

- Left: machine, then folder when a machine has more than one working directory, then Shelley threads.
- Center: thread and model picker. Model lists come from that machine's Shelley.
- Right: the machine website at `https_url`. Use **log in** if the site asks for an exe.dev session.
