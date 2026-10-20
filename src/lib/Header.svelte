<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';

    type Section = { letter: string };
    type PmItem = { id: string | number };
    type PackageQueue = { has(id: string | number): boolean };

    export let title: string = '.mdl';
    export let sections: Section[] = [];
    export let isEditMode: boolean = false;
    export let globalPmItems: Record<string, PmItem[]> = {};
    export let pmQueues: Record<string, PackageQueue> = {};

    export let ontoggleAllPm: (pm: string) => void = () => {};
    export let ontoggleEdit: () => void = () => {};
    export let ontriggerFileInput: () => void = () => {};
    export let onimportLink: () => void = () => {};
    export let ondownloadConfig: () => void = () => {};
    export let ongenerateShareLink: () => void = () => {};
    export let onaddApplication: () => void = () => {};
    export let onreset: () => void = () => {};

    let activeDropdown: string | null = null;
    let activeDropdownButton: HTMLButtonElement | null = null;

    function toggleDropdown(menu: string, event: MouseEvent) {
        if (activeDropdown === menu) {
            activeDropdown = null;
            activeDropdownButton = null;
            return;
        }
        activeDropdown = menu;
        activeDropdownButton = event.currentTarget as HTMLButtonElement;
    }

    function closeDropdown(restoreFocus = false) {
        const button = activeDropdownButton;
        activeDropdown = null;
        activeDropdownButton = null;
        if (restoreFocus && button) void tick().then(() => button.focus());
    }

    function handleWindowKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && activeDropdown) {
            event.preventDefault();
            closeDropdown(true);
        }
    }

    function handleWindowClick(event: MouseEvent) {
        if (activeDropdown && !(event.target instanceof Element && event.target.closest('.dropdown'))) {
            closeDropdown();
        }
    }

    function handleDropdownFocusout(event: FocusEvent) {
        const dropdown = event.currentTarget;
        if (
            activeDropdown &&
            dropdown instanceof HTMLElement &&
            !dropdown.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)
        ) {
            closeDropdown();
        }
    }

    let allFeedback: Record<string, string | null> = {};
    let allTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

    function handleToggleAll(pm: string) {
        const isAllAdded = globalPmItems[pm].every(item => pmQueues[pm]?.has(item.id));
        
        allFeedback[pm] = isAllAdded ? "Removed" : "Added";
        allFeedback = { ...allFeedback };
        
        if (allTimeouts[pm]) clearTimeout(allTimeouts[pm]);
        
        allTimeouts[pm] = setTimeout(() => {
            allFeedback[pm] = null;
            allFeedback = { ...allFeedback };
        }, 1000);
        
        ontoggleAllPm(pm);
    }

    onMount(() => {
        window.addEventListener('click', handleWindowClick);
        window.addEventListener('keydown', handleWindowKeydown);
    });

    onDestroy(() => {
        window.removeEventListener('click', handleWindowClick);
        window.removeEventListener('keydown', handleWindowKeydown);
    });
</script>

<div class="top-section">
    <header>
        <h1 id="main-title">
            {#if title === '.mdl'}
                <span class="accent-dot">.</span>mdl
            {:else}
                {title}
            {/if}
        </h1>
        
        <div id="admin-controls">
            {#if !isEditMode}
                {#each Object.keys(globalPmItems) as pm}
                    {#if globalPmItems[pm].length > 0}
                        {@const isAllAdded = globalPmItems[pm].every(item => pmQueues[pm]?.has(item.id))}
                        {@const feedback = allFeedback[pm]}
                        
                        <button type="button" class="quiet-button cmd-btn global-pm-btn {isAllAdded ? 'filled' : ''}" aria-pressed={isAllAdded} aria-label="{isAllAdded ? 'Remove all' : 'Add all'} {pm} applications to the install queue" on:click={() => handleToggleAll(pm)}>
                            {#if feedback === "Added"}
                                Added
                            {:else if feedback === "Removed"}
                                Removed
                            {:else}
                                All <span class="pm-command-text">{pm}</span>
                            {/if}
                        </button>
                    {/if}
                {/each}
            {/if}
            
            {#if isEditMode}
                <button type="button" on:click={() => onaddApplication()}>Add app</button>
                <div class="dropdown" on:focusout={handleDropdownFocusout}>
                    <button type="button" on:click={(event) => toggleDropdown('import', event)} class="dropbtn" aria-label="Import configuration" aria-expanded={activeDropdown === 'import'} aria-controls="import-menu">Import ▾</button>
                    <div id="import-menu" class="dropdown-content" class:show={activeDropdown === 'import'} role="group" aria-label="Import configuration options" hidden={activeDropdown !== 'import'}>
                        <button type="button" on:click={() => { closeDropdown(true); ontriggerFileInput(); }}>Import from file</button>
                        <button type="button" on:click={() => { closeDropdown(true); onimportLink(); }}>Import from link</button>
                    </div>
                </div>
                
                <div class="dropdown" on:focusout={handleDropdownFocusout}>
                    <button type="button" on:click={(event) => toggleDropdown('export', event)} class="dropbtn" aria-label="Export configuration" aria-expanded={activeDropdown === 'export'} aria-controls="export-menu">Export ▾</button>
                    <div id="export-menu" class="dropdown-content" class:show={activeDropdown === 'export'} role="group" aria-label="Export configuration options" hidden={activeDropdown !== 'export'}>
                        <button type="button" on:click={() => { closeDropdown(true); ondownloadConfig(); }}>Export to file</button>
                        <button type="button" on:click={() => { closeDropdown(true); ongenerateShareLink(); }}>Export as link</button>
                    </div>
                </div>

                <button type="button" id="reset-btn" on:click={() => onreset()}>Reset</button>
            {/if}

            <button type="button" id="edit-btn" class:quiet-button={isEditMode} on:click={() => ontoggleEdit()} aria-label={isEditMode ? 'Close editor' : 'Open options'}>
                {isEditMode ? 'Close' : 'Options'}
            </button>
        </div>
    </header>
    
    {#if !isEditMode}
        <nav aria-label="Application sections">
            <ul id="nav-list">
                {#each sections as section}
                    <li><a href="#{section.letter}">{section.letter}</a></li>
                {/each}
            </ul>
        </nav>
    {/if}
</div>