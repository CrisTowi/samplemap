# Contributing to SampleMap

Thanks for your interest in contributing!

## Getting Started

1. Fork the repo and clone it locally
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`
4. Create a branch: `git checkout -b feat/your-feature`

## Development

### Mock mode

Set `VITE_USE_MOCK_DATA=true` in `.env.local` to develop without API keys.

### Project structure

```
src/
  components/     # React components (one per file)
  services/       # API service layer (whosampled, youtube, spotify, musicbrainz)
  store/          # Zustand store
  mocks/          # Static mock data
  types/          # Shared TypeScript types
```

### Code style

- TypeScript strict mode — no `any` types
- One component per file
- All API calls go through `src/services/` — never inline in components
- All state mutations through Zustand actions — never mutate directly
- `async/await` over `.then()` chains
- Descriptive variable names — no single-character variables

### Type checking

```bash
pnpm exec tsc --noEmit
```

### Production build

```bash
pnpm build
```

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a short description of what changed and why
- The PR title should complete the sentence: *"This PR..."*

## Adding mock data

Mock sample relationships live in `src/mocks/whosampled.ts`. When adding new tracks, follow the existing pattern — define the `Track` object, then add entries to both `MOCK_SEARCH_RESULTS` and `MOCK_SAMPLE_RELATIONSHIPS`.

## Reporting bugs

Open an issue with:
- What you did
- What you expected
- What actually happened
- Browser and OS

## License

By contributing, you agree your changes will be licensed under the project's [MIT License](LICENSE).
