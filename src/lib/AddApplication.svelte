<script lang="ts">
    import { onMount } from 'svelte';
    import {
        addApplicationEntry,
        addNewSectionEntry,
        findApplicationNameConflicts,
        findWingetIdEntryLines,
        getSectionNames,
        getSuggestedSection,
        hasWingetId,
        mergeWingetIdIntoEntry,
        replaceApplicationEntry
    } from './appEntry.js';
    import { getCatalogTags, searchCatalog, type CatalogApplication } from './catalogSearch.js';

    type CatalogApp = CatalogApplication;
    type NameConflict = { name: string; section: string; lineIndex: number };
    type PendingApplication = { id: string; name: string; url: string; tags: string[] };

    const CREATE_SECTION = '__create_section__';
    const catalogUrl = new URL('data/catalog-full.json', new URL(import.meta.env.BASE_URL, window.location.origin));

    export let rawText = '';
    export let onadd: (text: string) => void = () => {};
    export let oncancel: () => void = () => {};

    let catalog: CatalogApp[] = [];
    let query = '';
    let debouncedQuery = '';
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let selected: CatalogApp | null = null;
    let searchName = '';
    let searchUrl = '';
    let sectionChoice = CREATE_SECTION;
    let newSection = '';
    let errorMessage = '';
    let isLoading = true;
    let loadError = '';
    let selectedTags: string[] = [];
    let nameConflicts: NameConflict[] = [];
    let pendingApplication: PendingApplication | null = null;
    let searchInput: HTMLInputElement | undefined;
    let dialogElement: HTMLDialogElement;
    let returnFocusTarget: HTMLElement | null = null;

    $: sections = getSectionNames(rawText);

    function handleSearchInput(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        query = value;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debouncedQuery = value;
        }, 250);
    }

    $: normalizedQuery = debouncedQuery.trim();
    $: results = searchCatalog(catalog, normalizedQuery);
    $: tagOptions = selected ? getCatalogTags(selected.category, selected.tags) : [];

    function formatIdSlug(id: string): string {
        const dotIndex = id.indexOf('.');
        const remainder = dotIndex !== -1 ? id.slice(dotIndex + 1) : id;
        return remainder
            .replace(/\./g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .toLowerCase();
    }

    onMount(() => {
        returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialogElement.showModal();
        searchInput?.focus();
        const loadCatalog = async () => {
            try {
                const response = await fetch(catalogUrl);
                if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);

                const data: unknown = await response.json();
                if (
                    typeof data !== 'object' ||
                    data === null ||
                    !('apps' in data) ||
                    !Array.isArray(data.apps) ||
                    !('fields' in data) ||
                    !Array.isArray(data.fields)
                ) {
                    throw new Error('The catalog file has an invalid format.');
                }

                const fields = data.fields;
                if (!fields.every((field): field is string => typeof field === 'string')) {
                    throw new Error('The catalog field list is invalid.');
                }
                if (!['id', 'name', 'publisher', 'description', 'version', 'homepage', 'category', 'tags'].every((field) => fields.includes(field))) {
                    throw new Error('The catalog is missing required application fields.');
                }
                const fieldIndex = Object.fromEntries(fields.map((field, index) => [field, index]));
                const rows: unknown[] = data.apps;
                catalog = rows
                    .map((row): CatalogApp | null => {
                        if (!Array.isArray(row)) return null;
                        const value = (field: string) => String(row[fieldIndex[field]] ?? '');
                        const id = value('id');
                        const name = value('name');
                        if (!id || !name) return null;
                        const publisher = value('publisher');
                        const description = value('description');
                        const tagsStr = value('tags');
                        const tags = tagsStr.split(/\s+/).filter(Boolean);
                        const idSlug = formatIdSlug(id);
                        const searchableText = `${id} ${idSlug} ${name} ${publisher} ${description} ${tagsStr}`.toLowerCase();

                        return {
                            id,
                            name,
                            publisher,
                            description,
                            version: value('version'),
                            homepage: value('homepage'),
                            category: value('category'),
                            tags,
                            searchableText,
                            idSlug
                        };
                    })
                    .filter((app): app is CatalogApp => app !== null);
                if (catalog.length === 0) throw new Error('The catalog contains no usable applications.');
            } catch (error) {
                loadError = error instanceof Error ? error.message : 'The catalog could not be loaded.';
            } finally {
                isLoading = false;
            }
        };
        void loadCatalog();
        return () => {
            if (dialogElement.open) dialogElement.close();
            if (returnFocusTarget?.isConnected) returnFocusTarget.focus();
        };
    });

    function chooseApplication(app: CatalogApp) {
        nameConflicts = [];
        pendingApplication = null;
        selected = app;
        searchName = app.name;
        searchUrl = validWebUrl(app.homepage) ? app.homepage : `https://winget.run/pkg/${encodeURIComponent(app.id)}`;
        sectionChoice = getSuggestedSection(rawText, app.name) ?? CREATE_SECTION;
        newSection = Array.from(app.name.trim())[0]?.toLocaleUpperCase() || 'Other';
        selectedTags = getCatalogTags(app.category, app.tags);
        errorMessage = hasWingetId(rawText, app.id) ? 'This Winget ID is already in your configuration.' : '';
    }

    function handleTagToggle(tag: string, event: Event) {
        const checked = (event.currentTarget as HTMLInputElement).checked;
        selectedTags = checked
            ? [...selectedTags, tag]
            : selectedTags.filter((selectedTag) => selectedTag !== tag);
    }

    function validWebUrl(value: string) {
        try {
            return ['http:', 'https:'].includes(new URL(value).protocol);
        } catch {
            return false;
        }
    }

    function handleAdd() {
        if (!selected || !searchName.trim() || !validWebUrl(searchUrl.trim())) {
            errorMessage = 'Enter an application name and a valid HTTP or HTTPS URL.';
            return;
        }

        const application = {
            id: selected.id,
            name: searchName.trim(),
            url: searchUrl.trim(),
            tags: selectedTags
        };

        const conflicts = findApplicationNameConflicts(rawText, application.name);
        const existingIdLines = findWingetIdEntryLines(rawText, application.id);
        if (existingIdLines.some((lineIndex) => !conflicts.some((conflict) => conflict.lineIndex === lineIndex))) {
            errorMessage = 'This Winget ID is already used by another entry.';
            return;
        }
        if (conflicts.length > 0) {
            nameConflicts = conflicts;
            pendingApplication = application;
            errorMessage = '';
            return;
        }

        try {
            const text = sectionChoice === CREATE_SECTION
                ? addNewSectionEntry(rawText, newSection.trim(), application)
                : addApplicationEntry(rawText, sectionChoice, application);
            onadd(text);
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'The application could not be added.';
        }
    }

    function resolveNameConflict(conflict: NameConflict, resolution: 'replace' | 'merge') {
        if (!pendingApplication) return;

        try {
            const text = resolution === 'replace'
                ? replaceApplicationEntry(rawText, conflict.lineIndex, pendingApplication)
                : mergeWingetIdIntoEntry(rawText, conflict.lineIndex, pendingApplication.id);
            onadd(text);
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'The duplicate entry could not be updated.';
            nameConflicts = [];
            pendingApplication = null;
        }
    }

    function idUsedByOtherConflict(conflict: NameConflict) {
        const application = pendingApplication;
        return application !== null && nameConflicts.some((other) =>
            other.lineIndex !== conflict.lineIndex &&
            hasWingetId(rawText.split(/\r?\n/)[other.lineIndex] ?? '', application.id)
        );
    }

    function handleDialogCancel(event: Event) {
        event.preventDefault();
        oncancel();
    }

    function handleDialogKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            oncancel();
        }
    }
</script>

<dialog bind:this={dialogElement} class="catalog-dialog" aria-modal="true" aria-labelledby="catalog-title" aria-describedby="catalog-description" on:cancel={handleDialogCancel} on:keydown={handleDialogKeydown} on:click={(event) => event.target === dialogElement && oncancel()}>
        <div class="catalog-heading">
            <div>
                <h2 id="catalog-title">Add Winget application</h2>
                <p id="catalog-description">Search the built-in Winget catalog and add a Markdown entry. Press Escape or choose Cancel to close.</p>
            </div>
        </div>

        {#if loadError}
            <p class="catalog-message error" role="alert">{loadError} Run <code>node tools/build-catalog.mjs</code> to build the catalog.</p>
        {:else}
            <label class="catalog-search">
                Search by application, publisher, description, or Winget ID
                <input bind:this={searchInput} value={query} on:input={handleSearchInput} type="search" placeholder="e.g. Firefox or Mozilla.Firefox">
            </label>

            {#if isLoading}
                <p class="catalog-message">Loading Winget catalog…</p>
            {:else if normalizedQuery && results.length === 0}
                <p class="catalog-message">No applications found.</p>
            {:else if results.length > 0}
                <p class="visually-hidden" role="status" aria-live="polite">{results.length} {results.length === 1 ? 'application' : 'applications'} found.</p>
                <ul class="catalog-results" aria-label="Catalog search results">
                    {#each results as app (app.id)}
                        <li>
                            <button type="button" class="catalog-result" class:selected={selected?.id === app.id} aria-pressed={selected?.id === app.id} on:click={() => chooseApplication(app)}>
                                <span class="catalog-result-name">{app.name}</span>
                                <span class="catalog-result-id">{app.id}</span>
                                {#if app.publisher}<span class="catalog-result-publisher">{app.publisher}</span>{/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        {/if}

        {#if selected && nameConflicts.length === 0}
            <div class="catalog-selected">
                <label>
                    Application name
                    <input bind:value={searchName} maxlength="120">
                </label>
                <label>
                    Application URL
                    <input bind:value={searchUrl} type="url">
                </label>
                <p class="catalog-id">Winget ID: <code>{selected.id}</code></p>
                {#if tagOptions.length}
                    <fieldset class="catalog-tag-options">
                        <legend>Tags to add</legend>
                        {#each tagOptions as tag}
                            <label class="catalog-tag-option">
                                <input type="checkbox" checked={selectedTags.includes(tag)} on:change={(event) => handleTagToggle(tag, event)}>
                                <span>{tag}</span>
                            </label>
                        {/each}
                    </fieldset>
                {/if}

                <label>
                    Add to section
                    <select bind:value={sectionChoice}>
                        {#each sections as section}
                            <option value={section}>{section}</option>
                        {/each}
                        <option value={CREATE_SECTION}>Create a new section…</option>
                    </select>
                </label>
                {#if sectionChoice === CREATE_SECTION}
                    <label>
                        New section name
                        <input bind:value={newSection} maxlength="80">
                    </label>
                {/if}
            </div>
        {/if}

        {#if nameConflicts.length > 0 && pendingApplication}
            <section class="catalog-duplicate-options" aria-labelledby="duplicate-title">
                <h3 id="duplicate-title">An entry named “{pendingApplication.name}” already exists</h3>
                <p>Choose how to resolve the matching entry. Replace and merge keep it in its current section.</p>
                {#each nameConflicts as conflict (conflict.lineIndex)}
                    {@const conflictHasId = hasWingetId(rawText.split(/\r?\n/)[conflict.lineIndex] ?? '', pendingApplication.id)}
                    {@const idUsedByAnotherEntry = idUsedByOtherConflict(conflict)}
                    <div class="catalog-duplicate-entry">
                        <p><strong>{conflict.name}</strong> in section <strong>{conflict.section}</strong></p>
                        <div class="catalog-duplicate-actions">
                            <button type="button" aria-label="Replace {conflict.name} in {conflict.section} with catalog entry" on:click={() => resolveNameConflict(conflict, 'replace')} disabled={idUsedByAnotherEntry}>Replace with catalog entry</button>
                            <button type="button" aria-label="Merge Winget ID into {conflict.name} in {conflict.section}" on:click={() => resolveNameConflict(conflict, 'merge')} disabled={conflictHasId || idUsedByAnotherEntry}>Merge Winget ID</button>
                        </div>
                    </div>
                {/each}
                {#if pendingApplication.tags.length > 0}
                    <p class="catalog-message">Replace adds the selected catalog tags. Merge keeps the existing entry’s name, URL, and tags.</p>
                {/if}
            </section>
        {/if}

        {#if errorMessage}<p class="catalog-message error" role="alert">{errorMessage}</p>{/if}

        <div class="catalog-actions">
            <button type="button" class="quiet-button" on:click={oncancel}>{nameConflicts.length > 0 ? 'Keep current entry' : 'Cancel'}</button>
            {#if nameConflicts.length === 0}
                <button type="button" on:click={handleAdd} disabled={!selected || Boolean(loadError) || (sectionChoice === CREATE_SECTION && !newSection.trim())}>Add</button>
            {/if}
        </div>
</dialog>