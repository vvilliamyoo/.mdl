<script lang="ts">
    import Header from './Header.svelte';
    import PmBar from './PmBar.svelte';
    import type { AppSection, PackageManagerType, PackageQueues } from './types.js';

    export let title = '.mdl';
    export let sections: AppSection[] = [];
    export let isEditMode = false;
    export let globalPmItems: Record<PackageManagerType, Array<{ id: string | number }>> = {
        winget: [],
        choco: [],
        apt: []
    };
    export let pmQueues: PackageQueues;

    export let ontoggleEdit: () => void = () => {};
    export let ontoggleAllPm: (pm: string) => void = () => {};
    export let ontriggerFileInput: () => void = () => {};
    export let onimportLink: () => void = () => {};
    export let ondownloadConfig: () => void = () => {};
    export let ongenerateShareLink: () => void = () => {};
    export let onaddApplication: () => void = () => {};
    export let onreset: () => void = () => {};
    export let oncopyPmCommand: (pm: string) => void = () => {};
    export let onclearPmQueue: (pm: string) => void = () => {};
</script>

<Header
    {title}
    {sections}
    {isEditMode}
    {globalPmItems}
    {pmQueues}
    ontoggleEdit={ontoggleEdit}
    ontoggleAllPm={ontoggleAllPm}
    ontriggerFileInput={ontriggerFileInput}
    onimportLink={onimportLink}
    ondownloadConfig={ondownloadConfig}
    ongenerateShareLink={ongenerateShareLink}
    onaddApplication={onaddApplication}
    onreset={onreset}
/>

<slot />

{#if !isEditMode}
    <PmBar {pmQueues} oncopy={oncopyPmCommand} onclear={onclearPmQueue} />
{/if}
