# Local patches to node_modules — reapply after any reinstall

## @argo-video/cli dist/record.js — Windows spawn fix

`execFile('npx', [...])` cannot work on Windows: `npx` is `npx.cmd`, and Node
>= 20.12 (CVE-2024-27980 hardening) refuses to exec `.cmd` files without a
shell. The child dies with EINVAL before writing a byte, so argo reports
`Playwright recording failed:` with NOTHING after the colon — an error message
that is itself a vacuous measurement.

Adding `shell: true` would be wrong here: execFile+shell does not quote args,
and this repo's absolute paths contain a space ("VSCode Projects").

Patch (one line):

```diff
- execFile('npx', ['playwright', 'test', '--config', recordConfigPath, ...
+ execFile(process.execPath, [path.resolve('node_modules', '@playwright', 'test', 'cli.js'), 'test', '--config', recordConfigPath, ...
```

Upstream-worthy: https://github.com/shreyaskarnik/argo — the same `execFile('npx', ...)`
pattern will fail for every Windows user on a current Node.
