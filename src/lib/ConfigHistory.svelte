<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import { diffConfigText } from './configHistory.js';
    import type { ConfigVersion } from './types.js';

    export let versions: ConfigVersion[] = [];
    export let onrestore: (rawText: string) => void = () => {};
    export let onexportfile: (rawText: string) => void = () => {};
    export let onexportlink: (rawText: string) => void | Promise<void> = () => {};
    export let onrename: (index: number, name: string) => boolean = () => false;
    export let ondelete: (index: number) => boolean = () => false;
    export let onclose: () => void = () => {};

    let dialogElement: HTMLDialogElement;
    let selectedIndex = 0;
    let activeExportIndex: number | null = null;
    let editingIndex: number | null = null;
    let draftName = '';
    let renameInput: HTMLInputElement;

    $: selectedVersion = versions[selectedIndex];
    $: previousVersion = versions[selectedIndex + 1];
    $: diff = selectedVersion && previousVersion
        ? diffConfigText(previousVersion.rawText, selectedVersion.rawText)
        : null;

    onMount(() => {
        dialogElement.showModal();
    });

    onDestroy(() => {
        if (dialogElement?.open) dialogElement.close();
    });

    function handleCancel(event: Event) {
        event.preventDefault();
        onclose();
    }

    async function startRename(index: number, name: string) {
        selectedIndex = index;
        activeExportIndex = null;
        draftName = name;
        editingIndex = index;
        await tick();
        renameInput?.focus();
        renameInput?.select();
    }

    function cancelRename() {
        editingIndex = null;
        draftName = '';
    }

    function selectVersion(index: number) {
        selectedIndex = index;
        activeExportIndex = null;
        if (editingIndex !== null && editingIndex !== index) cancelRename();
    }

    function saveRename(index: number) {
        if (onrename(index, draftName)) cancelRename();
    }

    function handleRenameKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelRename();
        }
    }

    function handleDelete(index: number) {
        const wasSelected = selectedIndex === index;
        if (!ondelete(index)) return;
        if (activeExportIndex === index) activeExportIndex = null;
        else if (activeExportIndex !== null && activeExportIndex > index) activeExportIndex--;
        if (editingIndex !== null && editingIndex > index) editingIndex--;
        if (selectedIndex > index) {
            selectedIndex--;
        } else if (wasSelected && selectedIndex >= versions.length - 1) {
            selectedIndex = Math.max(0, selectedIndex - 1);
        }
    }

    function handleExportFile(rawText: string) {
        activeExportIndex = null;
        onexportfile(rawText);
    }

    async function handleExportLink(rawText: string) {
        activeExportIndex = null;
        await onexportlink(rawText);
    }
</script>

<dialog
    bind:this={dialogElement}
    class="catalog-dialog history-dialog"
    aria-modal="true"
    aria-labelledby="history-title"
    on:cancel={handleCancel}
    on:click={(event) => event.target === dialogElement && onclose()}
>
    <div class="catalog-heading">
        <div>
            <h2 id="history-title">Configuration History</h2>
            <p>Saved versions are stored only in this browser</p>
        </div>
        <button type="button" class="quiet-button" on:click={() => onclose()} aria-label="Close configuration history">Close</button>
    </div>

    {#if versions.length === 0}
        <p class="history-empty">No saved versions yet. Save a valid configuration that differs from the previous saved version to create one.</p>
    {:else}
        <div class="history-content">
            <ol class="history-versions" aria-label="Saved configuration versions">
                {#each versions as version, index}
                    <li>
                        <div class="history-version-entry">
                            <button
                                type="button"
                                class="quiet-button history-version-select"
                                aria-label="Select {version.name || `Version ${versions.length - index}`}"
                                aria-pressed={selectedIndex === index}
                                on:click={() => selectVersion(index)}
                            ></button>
                            <div class="history-version-heading">
                                <div class="history-version-title-group">
                                    {#if editingIndex === index}
                                        <input
                                            bind:this={renameInput}
                                            bind:value={draftName}
                                            form="history-rename-form-{index}"
                                            class="history-rename-input"
                                            type="text"
                                            size={Math.max(1, draftName.length)}
                                            aria-label="Version name"
                                            on:keydown={handleRenameKeydown}
                                        />
                                    {:else}
                                        <strong>{version.name || `Version ${versions.length - index}`}</strong>
                                        <button
                                            type="button"
                                            class="quiet-button history-icon-button history-rename-button"
                                            aria-label="Rename {version.name || `Version ${versions.length - index}`}"
                                            title="Rename version"
                                            on:click={() => startRename(index, version.name || `Version ${versions.length - index}`)}
                                        >
                                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                                <path d="m11.5 2.5 2 2L6 12H4v-2zM10.5 3.5l2 2M3 13h10" />
                                            </svg>
                                        </button>
                                    {/if}
                                </div>
                                {#if editingIndex !== index}
                                    <button
                                        type="button"
                                        class="quiet-button history-icon-button history-delete-button"
                                        aria-label="Delete {version.name || `Version ${versions.length - index}`}"
                                        title="Delete version"
                                        on:click={() => handleDelete(index)}
                                    >
                                        <svg aria-hidden="true" viewBox="0 0 16 16">
                                            <path d="M2.5 4h11M6 4V2.5h4V4m2.5 0-.7 9h-7.6l-.7-9M6.5 6.5v4m3-4v4" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                            {#if editingIndex !== index}
                                <time class="history-version-time" datetime={version.savedAt}>{new Date(version.savedAt).toLocaleString()}</time>
                            {/if}
                            <div class="history-version-actions">
                                {#if editingIndex === index}
                                    <form
                                        id="history-rename-form-{index}"
                                        class="history-version-edit-actions"
                                        on:submit|preventDefault={() => saveRename(index)}
                                    >
                                        <button type="submit" class="quiet-button">Save</button>
                                        <button type="button" class="quiet-button" on:click={cancelRename}>Cancel</button>
                                    </form>
                                {:else}
                                    <button type="button" class="quiet-button" aria-label="Restore {version.name || `Version ${versions.length - index}`}" on:click={() => onrestore(version.rawText)}>Restore</button>
                                    <div class="history-export">
                                        <button
                                            type="button"
                                            class="quiet-button"
                                            aria-label="Export {version.name || `Version ${versions.length - index}`}"
                                            aria-expanded={activeExportIndex === index}
                                            aria-controls="history-export-menu-{index}"
                                            on:click={() => activeExportIndex = activeExportIndex === index ? null : index}
                                        >Export ▾</button>
                                        {#if activeExportIndex === index}
                                            <div id="history-export-menu-{index}" class="history-export-menu" role="group" aria-label="Export configuration version">
                                                <button type="button" class="quiet-button" on:click={() => handleExportFile(version.rawText)}>Export to file</button>
                                                <button type="button" class="quiet-button" on:click={() => handleExportLink(version.rawText)}>Export as link</button>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </li>
                {/each}
            </ol>

            {#if selectedVersion}
                <section class="history-preview" aria-label="Version changes">
                    {#if previousVersion}
                        <h3>Changes from previous saved version</h3>
                        {#if diff}
                            <pre class="history-diff" aria-label="Configuration text diff">{#each diff as line}<span class:added={line.type === 'added'} class:removed={line.type === 'removed'}>{line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text}</span>{/each}</pre>
                        {:else}
                            <p>The diff is too large to display. The saved version can still be restored.</p>
                        {/if}
                    {:else}
                        <h3>Oldest retained version</h3>
                        <pre class="history-diff">{selectedVersion.rawText}</pre>
                    {/if}

                </section>
            {/if}
        </div>
    {/if}
</dialog>
