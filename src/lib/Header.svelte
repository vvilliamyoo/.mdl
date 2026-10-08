<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

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
    export let onreset: () => void = () => {};

    let activeDropdown: string | null = null;

    function toggleDropdown(menu: string) {
        activeDropdown = activeDropdown === menu ? null : menu;
    }

    function handleWindowClick(event: MouseEvent) {
        if (activeDropdown && !(event.target as HTMLElement)?.closest('.dropdown')) {
            activeDropdown = null;
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
    });

    onDestroy(() => {
        window.removeEventListener('click', handleWindowClick);
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
                        
                        <button type="button" class="cmd-btn global-pm-btn {isAllAdded ? 'filled' : ''}" on:click={() => handleToggleAll(pm)}>
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
                <div class="dropdown">
                    <button type="button" on:click={() => toggleDropdown('import')} class="dropbtn" aria-haspopup="true" aria-expanded={activeDropdown === 'import'}>Import ▾</button>
                    {#if activeDropdown === 'import'}
                        <div class="dropdown-content show">
                            <button type="button" on:click={() => ontriggerFileInput()}>File</button>
                            <button type="button" on:click={() => onimportLink()}>Link</button>
                        </div>
                    {/if}
                </div>
                
                <div class="dropdown">
                    <button type="button" on:click={() => toggleDropdown('export')} class="dropbtn" aria-haspopup="true" aria-expanded={activeDropdown === 'export'}>Export ▾</button>
                    {#if activeDropdown === 'export'}
                        <div class="dropdown-content show">
                            <button type="button" on:click={() => ondownloadConfig()}>File</button>
                            <button type="button" on:click={() => ongenerateShareLink()}>Link</button>
                        </div>
                    {/if}
                </div>

                <button type="button" id="reset-btn" on:click={() => onreset()}>Reset</button>
            {/if}

            <button type="button" id="edit-btn" on:click={() => ontoggleEdit()}>
                {isEditMode ? 'Close' : 'Options'}
            </button>
        </div>
    </header>
    
    {#if !isEditMode}
        <nav>
            <ul id="nav-list">
                {#each sections as section}
                    <li><a href="#{section.letter}">{section.letter}</a></li>
                {/each}
            </ul>
        </nav>
    {/if}
</div>