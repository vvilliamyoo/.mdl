# MarkdownLoad (`.mdl`)
Maintain a web-based list of applications, drivers, and other download links with a Markdown configuration file. Written in [Svelte](https://svelte.dev/).

## Table of Contents
- [Overview](#overview)
- [Features](#features)
  - [Markdown Configuration File](#markdown-configuration-file)
  - [Interactive Application List](#interactive-application-list)
  - [Configuration Management](#configuration-management)
  - [Svelte Architecture](#svelte-architecture)
  - [Feature-Level Harnesses](#feature-level-harnesses)
- [Dependencies](#dependencies)
- [Configuration Guide](#configuration-guide)
  - [Structure & Syntax](#structure--syntax)
    - [YAML Frontmatter](#yaml-frontmatter)
    - [HTML Comments](#html-comments)
    - [Sections](#sections)
    - [Application Entries](#application-entries)
    - [Tags](#tags)
  - [Template](#template)

## Overview
MarkdownLoad (`.mdl`) is a Svelte Single Page Application (SPA) built around a portable Markdown configuration file. The file holds the core application list with support for tags as categories and package manager install commands. Optional visual customization parameters can be set by adding YAML frontmatter to the file.

While positioned primarily for applications, the list is flexible. As stated in the configuration guide, an "application" entry only needs a name and a URL, which opens up many options (e.g., drivers, BIOSes, wallpapers, scripts). If it has a name and a URL, it can be added.

The configuration file is complemented by informative and interactive features that minimize friction when using the list. `.mdl` also makes managing a configuration easy with built-in tools for editing, validating, importing, and exporting. Additional features act as feature-level harnesses that focus on efficient processing, data safety, and overhead minimization.

Svelte builds on these harnesses at the architectural level. Its reactive design, modularity, unidirectional data flow, and compile-time performance allow `.mdl` to be flexible and intuitive while being efficient, stable, and highly maintainable.

## Features
### Markdown Configuration File
- **Markdown to HTML:** [Marked](https://marked.js.org/) parses the configuration file and converts it into UI elements.
- **YAML-Based Visual Customization:** The configuration file stores editable parameters for the title, fonts, and colors (background, window, text, accent) as YAML frontmatter.
- **Mutable Application List:** Sections and items follow an intuitive template using standard Markdown formatting.
- **Extensible:** Common tag syntax supports custom categories and package manager install commands as well as easy implementation of new features.

### Interactive Application List
- **Navigation Bar:** Jump to a section using the always-visible navigation bar at the top of the page.
- **Favicon-Based Application Icons:** Application icons are automatically fetched from the provided URL using the Google S2 Favicon API.
- **Smart Tags:** Categorize applications using short tags, long tags, and command tags.
- **CLI Batch Installation:** Queue applications tagged with supported package managers to instantly generate and copy batch installation commands.

### Configuration Management
- **Built-In Text Editor:** View and edit the configuration directly from the website and save to local browser storage.
- **Color Customization Bar:** Modify YAML theme colors dynamically via quick HEX inputs or rich color pickers.
- **Import & Export:** Import/export a configuration file or encode its minified data into a URL via [`brotli-wasm`](https://github.com/google/brotli) compression.
- **Configuration Validation:** Importing or saving an edited configuration file triggers a validator to ensure that configurations adhere to key (but not all) aspects of required configuration file structure and syntax.

### Svelte Architecture
- **Modular Components:** This separation improves maintainability and allows complex UI elements to operate independently while sharing a unified global state.
- **Callback Props:** These functions enforce a strict, predictable data flow where user interactions update the central application state directly and synchronously.
- **Reactive Rendering:** The engine only touches UI elements that need to be changed which keeps rendering efficient and visual feedback immediate.

### Feature-Level Harnesses
- **AST-Powered Parsing & State Management:** An optimized approach for `.mdl`'s targeted, piecemeal changes to UI and other elements.
- **Robust XSS Sanitization:** Prevents malicious code execution during dynamic HTML injection and URL imports.
- **GPU Rendering Optimization:** Graphically-intensive backdrop filters are only rendered if supported to minimize GPU overhead on lower-end devices.

## Dependencies
- **[Svelte](https://svelte.dev/):** Powers the component-based UI architecture, client-side state management, and reactive rendering pipeline.
- **[Marked](https://marked.js.org/):** Parses the Markdown configuration file and converts it into the HTML elements used throughout the website.
- **[`brotli-wasm`](https://github.com/google/brotli):** Compresses and decompresses configuration data via WebAssembly for generating and parsing shareable links in the Export and Import menus.
- **Google S2 Favicon API:** Uses the `https://www.google.com/s2/favicons` external endpoint to fetch the favicon of an application's provided URL using its root domain.
- **[Source Code Pro](https://fonts.google.com/specimen/Source+Code+Pro?selected=Material+Symbols+Outlined:markdown_document:FILL@1;wght@400;GRAD@0;opsz@24&icon.query=markdown&icon.size=30&icon.color=%23375534&preview.layout=sample&categoryFilters=Appearance:%2FMonospace%2FMonospace)**: Uses a bundled copy as the default monospace font.

## Configuration Guide
### Structure & Syntax
`*` indicates a required element or parameter.

#### YAML Frontmatter
YAML frontmatter must begin and end with `---`. The following key-value pairs are supported: 
- `title: <string>`
- `monoFont: <font family>`
- `sansFont: <font family>`
- `background: #<3- or 6-digit HEX code>`
- `window: #<3- or 6-digit HEX code>`
- `text: #<3- or 6-digit HEX code>`
- `accent: #<3- or 6-digit HEX code>`
The order of these pairs does not matter. Not all pairs have to exist for the frontmatter to be valid.

#### HTML Comments
HTML comments are allowed but not rendered. If comments appear before the YAML frontmatter, they will suppress the frontmatter. This is a known issue -- not necessarily a feature -- with the regex anchoring logic but has low triage priority. Comments may be used as a quasi-archival feature by commenting out application entries, for keeping an application entry template, for adding miscellaneous comments, etc. Comments should never hold sensitive information like passwords or API keys.

#### Sections`*`
Sections must start with `#`, followed by a space, and end with the desired section name. Section names are recommended to be one character long, but can be longer. Each section must have at least one application entry to be rendered. This allows for sections to be added for future use without unnecessarily taking up space on the application list.

#### Application Entries`*`
Applications are added to sections as a list item using standard Markdown syntax of `-`, `*`, or `+`. Each item must use the following syntax: `- [<name*>](<url*>) #<shortTag> #[<Long Tag>] #[<command_tag>:<application_id>]`.

#### Tags
An application entry can have as many tags as desired, including command tags. All tags begin with `#`. Additional syntax depends on the type of tag; there are three types:
  - `#<shortTag>`: Best for single-word tags.
  - `#[<Long Tag>]`: Best for multi-word tags, but compatible with one-word tags.
  - `#[<command_tag>:<application_id>]`: A special long tag that surfaces CLI installation commands for supported package managers (WinGet (`winget`), Chocolatey (`choco`), APT (`apt`)).
    - **Note:** Application IDs may vary across package managers and must be verified.

### Template
```markdown
---
title: <title>
monoFont: <font family>
sansFont: <font family>
background: #<3- or 6-digit HEX code>
window: #<3- or 6-digit HEX code>
text: #<3- or 6-digit HEX code>
accent: #<3- or 6-digit HEX code>
---

<!-- Make sure to edit this configuration file template before importing -->

<!--
Application entry Template (* indicates a required element or parameter)
# <Section*>
- [<name*>](<url*>) #<shortTag> #[<Long Tag>] #[<command_tag>:<application_id>]
-->

# <Section>
- [<name*>](<url*>) #<shortTag> #[<Long Tag>] #[<command_tag>:<application_id>]
<!-- - [<name*>](<url*>) #<shortTag> #[<Long Tag>] #[<command_tag>:<application_id>] -->
```