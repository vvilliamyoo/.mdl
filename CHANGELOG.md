# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added support for Chocolatey and APT in the Package Manager Catalog (PMC).
- Implemented Markdown syntax highlighting and line numbers in the editor for improved configuration file editing experience.
- Added support for multiple package managers, including `scoop`, `brew`, and `pip`, to broaden application compatibility.
- Implemented an application metadata panel to display detailed information (description, version, tags) for each application.
- Added functionality for version tracking and a changelog feature to monitor configuration file changes.
- Integrated a dark/light theme toggle at runtime, supporting predefined presets and system preference detection.
- Implemented a service worker and PWA manifest to enable offline support and improved caching.

### Changed

- Refactored the PMC to be more extensible for future PM integrations.
- Refactored the application list management to support manual sorting and automated alphabetical sorting options.
- Enhanced the package manager registration system to be extensible for new package managers.
- Introduced new state management for application metadata and theme settings.
- Reworked the application list rendering to support virtual scrolling for performance with large lists of applications.

### Fixed

- Introduced error boundaries to gracefully handle unexpected errors within components.

## [2.1.7] - 2026-10-22

### Fixed

- Fixed build and deploy commands in the workflow file.

## [2.1.6] - 2026-10-22

### Changed

- Bumped Node.js to v24.22.1 in the workflow file.

## [2.1.5] - 2026-10-22

## Added

- Added build and deploy commands to the Winget catalog build script.

## Changed

- Pinned the Winget catalog build script Node.js version to 24.

## Removed

- Removed the v2.1.4 patch to the `predeploy` script.

## [2.1.4] - 2026-10-22

### Fixed

- Fixed the `predeploy` script to include the Winget catalog builder workflow in `dist`.

## [2.1.3] - 2026-10-22

### Fixed

- Fixed a cache miss that cause the Winget catalog to redownloaded on each update instead of reusing unchanged Winget manifests across upstream commits.

## [2.1.2] - 2026-10-22

### Fixed

- Restored the application name tooltip when hovering an icon in the package manager (PM) bar.
- Deduplicated dependencies (`vp dedupe`).
- Fixed formatting (`vp check --fix`).

## [2.1.1] - 2026-10-20

### Added

- Added a GitHub workflow to automatically build and update the Winget catalog on a schedule or via manual dispatch.

## [2.1.0] - 2026-10-19

This release adds the Package Manager Catalog (PMC), a feature for searching and adding application entries to the Markdown configuration file using a Winget catalog (additional PMs are under consideration). The catalog is generated from [Microsoft’s `winget-pkgs` manifests](https://github.com/microsoft/winget-pkgs/tree/master/manifests) using a script adapted from [OpenWin](https://github.com/fsamod/openwin).

### Added

- Added a searchable Winget catalog generated from Microsoft’s `winget-pkgs` manifests, including package descriptions, URLs, tags, and inferred categories.
- Added an editor workflow to search the catalog, review and edit an application’s name and URL, select tags, and add it to an existing or new configuration section.
- Added duplicate-name resolution options to keep the current entry, replace it with the catalog entry, or merge in its Winget ID.
- Added a catalog-generation script with local-source and smoke-test options, and wired catalog generation into deployment.

### Changed

- Updated Vite+ to 1.3.0.

### Fixed

- Improved accessibility with named landmarks and controls, corrected heading hierarchy and link semantics, and better keyboard navigation and focus management.
- Improved wrapping of catalog details and tags.

### Removed

- Removed rendering of redundant package manager chips.

## [2.0.5] - 2026-10-16

### Added

- Added file format parameter for application favicon generation.

### Changed

- Updated dependencies.
- Updated formatting in some files.

## [2.0.4] - 2026-10-16

This patch is focused on UI consistency and simplifies future design changes.

### Added

- Added custom CSS properties to `:root` for shared colors, blur, and radius values.
- Animated the navigation links in the header section list.

### Changed

- Reclassified some buttons as "quiet" buttons.
- Redesigned button and chip visuals.
- Refined and unified border radii.
- Adjusted button animations.
- Increased blur strength throughout.
- More UI colors are now derived from configured colors.

## [2.0.3] - 2026-10-15

### Added

- Migrated the development and build toolchain to Vite+, including integrated formatting, linting, type-aware checks, and staged-file checks.

### Changed

- Updated the README description and documented the current runtime, development, and deployment dependencies.
- Bumped the application version to 2.0.3 and synchronized the lockfile.

### Fixed

- Resolved lint warnings in configuration, state, and utility modules.

## [2.0.2] - 2026-10-11

### Fixed

- Applied the imported configuration's theme immediately after saving so updated colors take effect without requiring a page refresh.

## [2.0.1] - 2026-10-10

### Fixed

- Corrected package manager callback typing between the app list and queue actions.

## [2.0.0] - 2026-10-10

Application Download Links (ADL) is now MarkDownLoad (`.mdl`)! This second major release replaces the hardcoded application list with a portable Markdown configuration and refactors the application around [Svelte](https://svelte.dev/).

ADL was designed to simplify setting up a fresh or reinstalled desktop operating system. As a static HTML and CSS site, however, its application list was tedious to update and could not be customized. Applications could not be downloaded using a package manager (PM), only web links. This also meant batch installation was not an option.

`.mdl` addresses these limitations with a customizable Markdown application list, tags, PM commands, and built-in configuration tools. Optional YAML frontmatter provides visual customization. The Svelte single-page application provides a modular foundation for these features and future development.

This stable release is a security and stability patch of the release candidate, consolidating the new Markdown-driven configuration model with hardened rendering, improved runtime behavior, and broader test coverage.

### Added

- Added GitHub CLI to the default application configuration.
- Added automated tests covering editor state, configuration workflows, parse scheduling, queue behavior, UI feedback, and safe rendering of Markdown-derived config content.

### Changed

- Refactored configuration handling into focused modules for parsing, validation, persistence, theme application, and import/export workflows.
- Split application state into dedicated stores and helpers for the editor, package manager queue, transient UI feedback, and app list rendering.
- Extracted the app list and page shell into reusable Svelte components to simplify maintenance and improve render stability.
- Added shared TypeScript-style definitions for app configuration, editor state, themes, and package manager queue data.
- Reworked the app’s visual styling and HTML shell, including removal of the duplicate footer and refinement of the page layout.
- Debounced Markdown re-parsing while editing to reduce unnecessary rebuilds and avoid churn during configuration updates.
- Avoided redundant app-list regeneration when only theme metadata changes and prevented duplicate parsing during save operations.
- Deferred Brotli/WASM initialization until it is actually required, reducing startup cost and avoiding unnecessary resource loading.

### Fixed

- Corrected the GitHub Desktop package identifier in the default application list.
- Improved theme application behavior so imported configuration changes take effect without requiring a manual page refresh.
- Cleared up build and deployment inconsistencies introduced during the RC refactor.

### Security

- Fixed a cross-site scripting issue in configuration-derived UI content by escaping untrusted text while preserving supported tags and package manager actions.
- Hardened rendering paths for processed configuration entries to avoid unsafe HTML injection from untrusted app metadata.

## [2.0.0-rc.1] - 2026-10-08

This release candidate marks the transition from the original static HTML app list to a data-driven, Markdown-backed configuration system built on [Svelte](https://svelte.dev/) and Vite. The project is now named MarkDownLoad (`.mdl`) and is designed to support richer configuration, package manager actions, and easier maintenance across reinstalled or fresh desktop environments.

### Added

- Replaced the hardcoded application list with a portable Markdown configuration (`public/config.md`) that defines apps, tags, and package manager actions in a versioned, human-editable format.
- Added support for YAML frontmatter and HTML comments in the config file to drive metadata, theme colors, and content structure without modifying the app source.
- Added a Svelte single-page application with modular UI components for the header, editor, app list, and package manager controls.
- Added dynamic Markdown rendering with `marked` so entries, descriptions, and tag metadata can be displayed from config content at runtime.
- Added package manager action support through tagged links such as `#[winget:app-id]` and other command identifiers, enabling installation workflows beyond simple web downloads.
- Added local configuration tooling for editing, importing, and exporting the app list without manually editing the underlying HTML or JavaScript.
- Added static-site build and deployment support via Vite and `gh-pages`, including GitHub Pages compatibility files such as `.nojekyll`.
- Added a custom browser-side theme model driven by parsed config metadata so visual branding can be adjusted without changing the app shell.

### Changed

- Reworked the project architecture from a monolithic HTML/CSS prototype into a component-based Svelte app using a clear separation between UI, configuration parsing, and state management.
- Moved the app’s content from static markup into a structured Markdown source, allowing updates to be committed and shared more easily than an embedded HTML list.
- Improved maintainability by splitting presentation and logic across `src/App.svelte`, `src/lib/*`, and shared CSS instead of relying on a single page script and stylesheet.
- Introduced a Vite-based frontend toolchain with Svelte plugin support, dependency management, and a modern build pipeline for local development and deployment.
- Updated the README and project docs to describe the new configuration schema, frontmatter usage, template syntax, and package manager conventions.

### Removed

- Removed the previous static HTML-only application registry and the manual maintenance workflow that required editing embedded lists in the page source.
- Removed the limitation of only supporting direct web links; the project no longer depends exclusively on static hyperlinks for software installation.

### Security

- Hardened config rendering against unsafe content by moving to a safer, structured parsing model that separates application data from rendered HTML output.

## [1.0.0] - 2021-07-12

### Added

- Initial release of ADL.
