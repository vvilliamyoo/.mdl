<script lang="ts">
    import { onMount } from 'svelte';
    import {
        addApplicationEntry,
        addNewSectionEntry,
        getSectionNames,
        getSuggestedSection,
        hasWingetId
    } from './appEntry.js';
    import { searchCatalog } from './catalogSearch.js';

    type CatalogApp = {
        id: string;
        name: string;
        publisher: string;
        description: string;
        version: string;
        homepage: string;
        category: string;
        tags: string[];
    };

    const CREATE_SECTION = '__create_section__';
    const catalogUrl = new URL('data/catalog-full.json', new URL(import.meta.env.BASE_URL, window.location.origin));

    export let rawText = '';
    export let onadd: (text: string) => void = () => {};
    export let oncancel: () => void = () => {};

    let catalog: CatalogApp[] = [];
    let query = '';
    let selected: CatalogApp | null = null;
    let searchName = '';
    let searchUrl = '';
    let sectionChoice = CREATE_SECTION;
    let newSection = '';
    let errorMessage = '';
    let isLoading = true;
    let loadError = '';
    let searchInput: HTMLInputElement | undefined;
    let dialogElement: HTMLDialogElement;

    $: sections = getSectionNames(rawText);
    $: normalizedQuery = query.trim();
    $: results = searchCatalog(catalog, normalizedQuery);
    $: selectedTags = selected
        ? [...new Set([selected.category === 'other' ? '' : selected.category, ...selected.tags].filter(Boolean))]
        : [];

    onMount(() => {
        dialogElement.showModal();
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
                        return {
                            id,
                            name,
                            publisher: value('publisher'),
                            description: value('description'),
                            version: value('version'),
                            homepage: value('homepage'),
                            category: value('category'),
                            tags: value('tags').split(/\s+/).filter(Boolean)
                        };
                    })
                    .filter((app): app is CatalogApp => app !== null);
                if (catalog.length === 0) throw new Error('The catalog contains no usable applications.');
            } catch (error) {
                loadError = error instanceof Error ? error.message : 'The catalog could not be loaded.';
            } finally {
                isLoading = false;
                searchInput?.focus();
            }
        };
        void loadCatalog();
        return () => {
            if (dialogElement.open) dialogElement.close();
        };
    });

    function chooseApplication(app: CatalogApp) {
        selected = app;
        searchName = app.name;
        searchUrl = validWebUrl(app.homepage) ? app.homepage : `https://winget.run/pkg/${encodeURIComponent(app.id)}`;
        sectionChoice = getSuggestedSection(rawText, app.name) ?? CREATE_SECTION;
        newSection = Array.from(app.name.trim())[0]?.toLocaleUpperCase() || 'Other';
        errorMessage = hasWingetId(rawText, app.id) ? 'This Winget ID is already in your configuration.' : '';
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
        if (hasWingetId(rawText, selected.id)) {
            errorMessage = 'This Winget ID is already in your configuration.';
            return;
        }

        const application = {
            id: selected.id,
            name: searchName.trim(),
            url: searchUrl.trim(),
            tags: selectedTags
        };

        try {
            const text = sectionChoice === CREATE_SECTION
                ? addNewSectionEntry(rawText, newSection.trim(), application)
                : addApplicationEntry(rawText, sectionChoice, application);
            onadd(text);
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'The application could not be added.';
        }
    }

    function handleDialogCancel(event: Event) {
        event.preventDefault();
        oncancel();
    }
</script>

<dialog bind:this={dialogElement} class="catalog-dialog" aria-modal="true" aria-labelledby="catalog-title" on:cancel={handleDialogCancel} on:click={(event) => event.target === dialogElement && oncancel()}>
        <div class="catalog-heading">
            <div>
                <h2 id="catalog-title">Add Winget application</h2>
                <p>Search the built-in Winget catalog and add a Markdown entry.</p>
            </div>
            <button type="button" class="quiet-button" aria-label="Close" on:click={oncancel}>Close</button>
        </div>

        {#if loadError}
            <p class="catalog-message error" role="alert">{loadError} Run <code>node tools/build-catalog.mjs</code> to build the catalog.</p>
        {:else}
            <label class="catalog-search">
                Search by application, publisher, description, or Winget ID
                <input bind:this={searchInput} bind:value={query} type="search" placeholder="e.g. Firefox or Mozilla.Firefox" disabled={isLoading}>
            </label>

            {#if isLoading}
                <p class="catalog-message">Loading Winget catalog…</p>
            {:else if normalizedQuery && results.length === 0}
                <p class="catalog-message">No applications found.</p>
            {:else if results.length > 0}
                <ul class="catalog-results" aria-label="Catalog search results">
                    {#each results as app (app.id)}
                        <li>
                            <button type="button" class="catalog-result" class:selected={selected?.id === app.id} on:click={() => chooseApplication(app)}>
                                <span class="catalog-result-name">{app.name}</span>
                                <span class="catalog-result-id">{app.id}</span>
                                {#if app.publisher}<span class="catalog-result-publisher">{app.publisher}</span>{/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        {/if}

        {#if selected}
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
                {#if selectedTags.length}
                    <p class="catalog-tags">Tags to add: {selectedTags.join(', ')}</p>
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

        {#if errorMessage}<p class="catalog-message error" role="alert">{errorMessage}</p>{/if}

        <div class="catalog-actions">
            <button type="button" class="quiet-button" on:click={oncancel}>Cancel</button>
            <button type="button" on:click={handleAdd} disabled={!selected || Boolean(loadError) || (sectionChoice === CREATE_SECTION && !newSection.trim())}>Add application</button>
        </div>
</dialog>
