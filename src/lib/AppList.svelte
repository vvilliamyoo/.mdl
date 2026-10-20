<script lang="ts">
    import { getFaviconUrl, sanitizeURL } from './utils.js';
    import { isQueueItemAdded } from './pmQueue.js';
    import { feedbackStore } from './uiFeedback.js';
    import type { AppSection, PackageManagerType, PackageQueues } from './types.js';

    export let sections: AppSection[] = [];
    export let pmQueues: PackageQueues;
    export let ontogglePm: (type: PackageManagerType, id: string | number, domain: string, appName: string) => void = () => {};
</script>

<div id="content">
    {#each sections as section}
        <h2 id={section.letter} tabindex="-1">{section.letter}</h2>
        <hr>
        {#each section.apps as app}
            <div class="container app-item">
                <p class="app-item-details">
                    {#if app.domain}
                        <img src={getFaviconUrl(app.domain)} alt="" class="favicon-img" loading="lazy" decoding="async">
                    {/if}
                    {app.name}
                    {@html app.chipHtml}
                </p>
                <div class="app-actions">
                    {#each app.pmData as pm}
                        {@const isAdded = isQueueItemAdded(pmQueues, pm.type, pm.id)}
                        {@const feedback = $feedbackStore[`${pm.type}-${pm.id}`]}

                        <button type="button" class="quiet-button cmd-btn {isAdded ? 'filled' : ''}" aria-pressed={isAdded} aria-label="{isAdded ? 'Remove' : 'Add'} {app.name} {isAdded ? 'from' : 'to'} the {pm.type} install queue" on:click={() => ontogglePm(pm.type, pm.id, app.domain ?? '', app.name)}>
                            {#if feedback === "Added"}
                                Added
                            {:else if feedback === "Removed"}
                                Removed
                            {:else}
                                <span class="pm-command-text">{pm.type}</span>
                            {/if}
                        </button>
                    {/each}
                    <a class="download-button" href={sanitizeURL(app.url)} target="_blank" rel="noopener noreferrer" aria-label="Download {app.name}">Download</a>
                </div>
            </div>
        {/each}
    {/each}
</div>
