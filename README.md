# Diodati

![Diodati lists sample machines and a Shelley thread](docs/interface.png)

Desktop client for exe.dev machines and the Shelley agent on each machine.

Diodati lists machines with `ssh exe.dev ls --json`. It drives Shelley through SSH, using the keys already on this computer.

```
bun install
bun test
bun run dev
```

`bun run demo` opens the sample window above. It does not call SSH.
