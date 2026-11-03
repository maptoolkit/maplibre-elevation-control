# Contributing

Thanks for your interest in this plugin! Issues and pull requests are welcome. This page explains how we run the project, so you know what to expect and don't spend time on something we can't merge.

## What this plugin is (and isn't)

`maplibre-elevation-control` is a MapLibre GL JS control that shows an interactive elevation profile for a 3D GeoJSON line (`[lng, lat, ele]`), based on [`@maptoolkit/elevation-profile`](https://github.com/maptoolkit/elevation-profile). It connects that profile to the map: hover and selection are drawn on the route, and the control exposes events, options and CSS custom properties for integration. See the [README](README.md) for the full API.

**In scope:**

- Bugs in the control, its map layers, events, open/close behavior or accessibility
- Compatibility with new `maplibre-gl` versions
- Small improvements to the existing options, events and styling hooks

**Out of scope:**

- Fetching or calculating elevation data or routes (the control expects a GeoJSON feature that already contains elevations)
- Features of the profile chart itself (axes, section bars, hover badges, etc.). These belong in [`@maptoolkit/elevation-profile`](https://github.com/maptoolkit/elevation-profile)
- Built-in UI beyond the profile (statistics panels, export buttons, route editing)
- Support for non-MapLibre map libraries, or UMD/CJS builds (the package is ESM-only)

If you're unsure which side your idea falls on, open an issue and ask.

## Our philosophy: small and focused

We want to keep this plugin small. It is maintained by [Maptoolkit](https://www.maptoolkit.com) alongside our other work, and every feature adds code, documentation, tests and maintenance for years to come.

That's why we are deliberately conservative about new features. Before proposing something, ask yourself:

- Does it fit the plugin's core purpose, or is it a separate concern?
- Can it be solved in application code with the existing options, events or methods?
- Would most users benefit from it, or only a specific setup?

If the answer points to a niche use case, forking the plugin or building on top of it is often the better path. The BSD-3-Clause license explicitly allows this.

## What we don't promise

- **We may not implement everything.** A good idea can still be a "no" if it doesn't fit the scope.
- **Response times vary.** We'll try to respond within a reasonable time, but we can't guarantee it.
- **Closed doesn't mean bad.** We may close issues or pull requests that are out of scope. This is never a judgement on you or your work.
- **No support for the Maptoolkit APIs here.** For questions about API keys, plans or the Maptoolkit service itself, please contact [buero@maptoolkit.com](mailto:buero@maptoolkit.com).

## Reporting bugs

Please [search existing issues](../../issues) first. A good bug report includes:

- The plugin version and the `maplibre-gl` version (the plugin is built and tested against v6)
- Browser and OS
- What you expected and what happened instead
- A minimal reproduction (a [CodeSandbox](https://codesandbox.io), StackBlitz or JSFiddle link is ideal, or a short code snippet)
- Console errors, if any

Reports we can reproduce quickly get fixed quickly.

## Suggesting features

**Please open an issue first and wait for feedback.** Describe:

1. The problem you are trying to solve (not just the solution you have in mind)
2. Why the current options, events or methods don't cover it
3. A rough idea of the API you'd expect

We'll tell you whether it fits the project. Many requests are better solved differently than first proposed, and that conversation is much cheaper before code exists than after.

## Pull requests

**Every pull request should reference an issue where the change was discussed and agreed.** Please don't start work on a larger change before that. PRs without a prior discussion may be closed, even if the code is good.

The exceptions are small, obvious fixes that need no discussion:

- Typos and documentation improvements
- Small, clearly scoped bug fixes

For these, a PR on its own is fine.

### Guidelines

- Keep PRs small and focused: one change per PR
- Follow the existing code style; the repo uses ESLint and Prettier
- Add or update tests for behavior changes
- Update the README if you change the public API (options, events, methods)
- No new runtime dependencies without prior agreement in the issue
- Add a [changeset](https://github.com/changesets/changesets) (`npx changeset`) for user-facing changes

### Development setup

```bash
git clone https://github.com/maptoolkit/maplibre-elevation-control.git
cd maplibre-elevation-control
npm install
```

The `demo/` folder contains a small Vite-based demo page (also published as the [live demo](https://maptoolkit.github.io/maplibre-elevation-control/)), tests run with Vitest.

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the demo page with hot reload                |
| `npm test`          | Run the tests once (`npm run test:watch` to watch) |
| `npm run lint`      | Run ESLint                                         |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run format`    | Format the code with Prettier                      |
| `npm run build`     | Build the library                                  |

Before opening a PR, please make sure that `npm run lint`, `npm run typecheck` and `npm test` pass.

### What happens after you open a PR

We review PRs when we have capacity. We may ask for changes, suggest a different approach, or decline the PR. Please be patient. If a PR is inactive for a longer time after our feedback, we may close it; you're welcome to reopen it later.

## Code of conduct

Be respectful and constructive. We're happy to help, and we expect the same tone in return. Harassment or hostile behavior will not be tolerated.

## License

By contributing, you agree that your contributions are licensed under the project's [BSD-3-Clause License](LICENSE).
