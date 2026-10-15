# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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