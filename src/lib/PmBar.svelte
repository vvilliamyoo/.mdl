<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import { PACKAGE_MANAGERS, getFaviconUrl } from './utils.js';

    type QueueItem = { domain: string; appName: string };
    type PackageQueue = { size: number; values: () => IterableIterator<QueueItem> };

    export let pmQueues: Record<string, PackageQueue> = {};
    export let oncopy: (pm: string) => void = () => {};
    export let onclear: (pm: string) => void = () => {};

    const packageManagers: Record<string, string> = PACKAGE_MANAGERS as Record<string, string>;

    $: activePMs = Object.keys(pmQueues).filter(pm => (pmQueues[pm]?.size ?? 0) > 0);

    let containerRef: HTMLDivElement | null = null;

    function updateHeight() {
        if (containerRef && activePMs.length > 0) {
            const height = containerRef.offsetHeight;
            document.documentElement.style.setProperty('--pm-bar-height', `${height}px`);
        } else {
            document.documentElement.style.setProperty('--pm-bar-height', '0px');
        }
    }

    onMount(() => {
        updateHeight();
        const observer = new ResizeObserver(() => updateHeight());
        if (containerRef) observer.observe(containerRef);
        return () => observer.disconnect();
    });

    $: if (activePMs) {
        tick().then(updateHeight);
    }

    onDestroy(() => {
        document.documentElement.style.setProperty('--pm-bar-height', '0px');
    });
</script>

{#if activePMs.length > 0}
    <div id="pm-bar-container" bind:this={containerRef} style="display: flex;">
        {#each activePMs as pm}
            {@const items = Array.from(pmQueues[pm].values())}
            <div class="pm-bar-instance">
                <div class="pm-bar-info">
                    <span class="pm-bar-command"><strong>{packageManagers[pm]}</strong></span>
                    <div class="pm-bar-icons-container">
                        {#each items as item}
                            {@const iconSrc = getFaviconUrl(item.domain)}
                            {#if iconSrc}
                                <img src={iconSrc} alt="{item.appName} icon" class="pm-bar-favicon" title={item.appName} decoding="async">
                            {:else}
                                <span class="pm-bar-favicon" title={item.appName}>📦</span>
                            {/if}
                        {/each}
                    </div>
                </div>
                <span class="pm-bar-buttons">
                    <button type="button" class="pm-action-btn" on:click={() => oncopy(pm)}>Copy</button>
                    <button type="button" class="pm-action-btn" on:click={() => onclear(pm)}>Clear</button>
                </span>
            </div>
        {/each}
    </div>
{/if}