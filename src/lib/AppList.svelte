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
        <h2 id={section.letter}>{section.letter}</h2>
        <hr>
        {#each section.apps as app}
            <div class="container app-item">
                <p class="app-item-details">
                    {#if app.domain}
                        <img src={getFaviconUrl(app.domain)} alt="{app.name} icon" class="favicon-img" loading="lazy" decoding="async">
                    {/if}
                    {app.name}
                    {@html app.chipHtml}
                </p>
                <div class="app-actions">
                    {#each app.pmData as pm}
                        {@const isAdded = isQueueItemAdded(pmQueues, pm.type, pm.id)}
                        {@const feedback = $feedbackStore[`${pm.type}-${pm.id}`]}

                        <button type="button" class="quiet-button cmd-btn {isAdded ? 'filled' : ''}" on:click={() => ontogglePm(pm.type, pm.id, app.domain ?? '', app.name)}>
                            {#if feedback === "Added"}
                                Added
                            {:else if feedback === "Removed"}
                                Removed
                            {:else}
                                <span class="pm-command-text">{pm.type}</span>
                            {/if}
                        </button>
                    {/each}
                    <a href={sanitizeURL(app.url)} target="_blank" rel="noopener noreferrer"><button type="button">Download</button></a>
                </div>
            </div>
        {/each}
    {/each}
</div>
<footer id="main-footer">
    <ul>
        <li>
            <a href="https://github.com/vvilliamyoo/.mdl" target="_blank" rel="noopener noreferrer">GitHub</a>
        </li>
        <li>
            <a href="https://github.com/vvilliamyoo/.mdl/blob/main/README.md" target="_blank" rel="noopener noreferrer">Documentation</a>
        </li>
        <li>
            <a href="https://github.com/vvilliamyoo/.mdl/blob/main/README.md#configuration-guide" target="_blank" rel="noopener noreferrer">Configuration Guide</a>
        </li>
    </ul>
</footer>
