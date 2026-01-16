# Agent Guidelines

This document provides essential information for AI agents working on @motioneffector libraries.

## Project Structure

```
├── src/                    # TypeScript source code
├── dist/                   # Built output (generated)
├── manual/                 # Documentation
│   ├── src/                # Markdown source files
│   ├── index.html          # Generated HTML (from Home.md)
│   ├── *.html              # Generated HTML pages
│   └── manual.css          # Stylesheet
├── scripts/                # Build scripts
│   ├── build-manual.cjs    # Markdown → HTML converter
│   ├── manual-template.html
│   └── manual.css          # Source CSS
├── demo-files/             # Demo page assets
│   ├── demo.js             # Demo interactivity
│   ├── demo.css            # Demo styling
│   └── tests.js            # Browser test definitions
├── index.html              # Interactive demo page
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

## Commands

### Building

```bash
npm run build          # Full build: TypeScript + Vite + Manual
npm run build:manual   # Build manual HTML from markdown only
npm run dev            # Start Vite dev server with hot reload
```

### Testing

```bash
npm test               # Run Vitest in watch mode
npm run test:run       # Run tests once (CI mode)
npm run fuzz:thorough  # Extended fuzz testing (only when explicitly requested)
```

### Code Quality

```bash
npm run typecheck      # TypeScript type checking without emit
npm run lint           # ESLint
npm run format         # Prettier formatting
```

## Key Conventions

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- **Zero runtime dependencies** - All libraries are dependency-free
- **Full type coverage** - Export all public types from index.ts

### Testing

- **Vitest** for all tests
- Test files use `.test.ts` suffix
- Colocate tests with source: `src/foo.ts` → `src/foo.test.ts`
- Fuzz tests in `src/fuzz.test.ts` (if present)
- Security tests in `src/security.test.ts` (if present)

### Documentation

- Manual source lives in `manual/src/*.md`
- Do NOT edit generated HTML in `manual/*.html`
- Run `npm run build:manual` after editing markdown
- `_Sidebar.md` defines navigation structure
- `Home.md` becomes `index.html`

### Demo

- `index.html` is the interactive demo page
- Demo logic in `demo-files/demo.js`
- Browser tests in `demo-files/tests.js`
- Demo uses built library from `dist/`

## Git Workflow

### Branch

Work is typically done on feature branches. Check current branch before committing.

### Commit Messages

Use conventional commits:

```
feat(scope): add new feature
fix(scope): fix bug description
docs: update documentation
refactor(scope): restructure without behavior change
test: add or update tests
chore: maintenance tasks
```

### What to Commit

- Source code changes in `src/`
- Test updates
- Documentation source in `manual/src/`
- Generated manual HTML in `manual/`
- Demo updates in `demo-files/` and `index.html`

### What NOT to Commit

- `node_modules/`
- `dist/` is gitignored except `dist/index.js` (for demo)
- `.claude/` directory
- Log files

## Before You Start

1. **Read the manual** - `manual/src/Home.md` provides library overview
2. **Run tests** - `npm run test:run` to verify everything passes
3. **Check types** - `npm run typecheck` to ensure no type errors
4. **Understand the demo** - Open `index.html` to see the library in action

## Common Tasks

### Adding a Feature

1. Write tests first in `src/feature.test.ts`
2. Implement in `src/`
3. Export from `src/index.ts` if public
4. Run `npm run test:run && npm run typecheck`
5. Update manual if needed (`manual/src/`)
6. Rebuild: `npm run build`

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the code
3. Verify test passes
4. Run full test suite: `npm run test:run`

### Updating Documentation

1. Edit markdown in `manual/src/`
2. Run `npm run build:manual`
3. Verify HTML output in `manual/`
4. Check links work by opening in browser

## Constraints

- **No new dependencies** without explicit approval
- **No breaking API changes** without discussion
- **Maintain zero-dependency philosophy**
- **Keep bundle size minimal**
- **Preserve backward compatibility**

## Library-Specific Notes

Each library has unique domain concepts. Read these manual pages first:

- `manual/src/Home.md` - Overview and quick start
- `manual/src/Installation.md` - Setup requirements
- `manual/src/Concept-*.md` - Core concepts
- `manual/src/API-*.md` - API reference

The demo page (`index.html`) demonstrates real usage patterns.
