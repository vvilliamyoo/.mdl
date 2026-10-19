<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Editor from './lib/Editor.svelte';
    import AddApplication from './lib/AddApplication.svelte';
    import AppList from './lib/AppList.svelte';
    import PageShell from './lib/PageShell.svelte';
    import { applyTheme as applyDocumentTheme } from './lib/theme.js';
    import { createEmptyConfig } from './lib/appState.js';
    import { clearAllFeedback, showFeedback } from './lib/uiFeedback.js';
    import { copyText, showAlert, showConfirm } from './lib/browserApi.js';
    import { createConfigActions } from './lib/configActions.js';
    import {
        appStore,
        editorSessionStore,
        initializeAppStore,
        updateDraftThemeText,
        setEditorDraft,
        beginEditing,
        closeEditor,
        cancelEditorDraft,
        saveEditorDraft,
        pmItemsStore
    } from './lib/appStore.js';
    import {
        queueStore,
        toggleQueuedItem,
        toggleAllQueuedItems,
        getQueuedCommand,
        clearQueuedItems
    } from './lib/queueStore.js';

    import type { AppConfig, PackageManagerType, PackageQueues } from './lib/types.js';
    type PmType = PackageManagerType;

    let appConfig: AppConfig = createEmptyConfig();
    let draftText = appConfig.rawText;
    let initialRawText = '';
    let isEditMode = false;
    let isAddApplicationOpen = false;

    const unsubscribeConfig = appStore.subscribe((value) => {
        appConfig = value;
    });
    const unsubscribeEditor = editorSessionStore.subscribe((session) => {
        draftText = session.draftText;
        initialRawText = session.initialText;
        isEditMode = session.isEditing;
    });

    let fileInputRef: HTMLInputElement | null = null;

    let pmQueues: PackageQueues;
    const unsubscribeQueue = queueStore.subscribe((value) => {
        pmQueues = value;
    });

    const configActions = createConfigActions({
        setDraft: handleTextChange,
        notify: showAlert,
        confirmReset: showConfirm,
        reload: () => location.reload(),
        getLocation: () => `${window.location.origin}${window.location.pathname}`
    });

    onMount(async () => {
        const config = await initializeAppStore((import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL);
        appConfig = config;
        applyTheme(appConfig.theme);
    });

    onDestroy(() => {
        unsubscribeConfig();
        unsubscribeEditor();
        unsubscribeQueue();
        clearAllFeedback();
    });

    function applyTheme(theme: AppConfig['theme']) {
        applyDocumentTheme(theme);
    }

    function toggleEditMode() {
        if (isEditMode) {
            if (!closeEditor()) {
                showAlert("Please save or cancel unsaved changes");
                return;
            }
            isAddApplicationOpen = false;
            applyTheme(appConfig.theme);
        } else {
            beginEditing();
        }
    }

    function handleTextChange(text: string) {
        setEditorDraft(text);
    }

    function handleUpdateColor({ key, value }: { key: string; value: string }) {
        appConfig = updateDraftThemeText(key, value);
        applyTheme(appConfig.theme);
    }

    function handleSave() {
        const result = saveEditorDraft();
        if (!result.valid) {
            showAlert(`Save Failed: ${result.error}`);
            return;
        }
        appConfig = result.config;
        applyTheme(result.config.theme);
        showAlert("All changes saved to browser memory");
    }

    function handleAddApplication(text: string) {
        setEditorDraft(text);
        isAddApplicationOpen = false;
        showAlert("Application added to the draft. Save to apply the changes.");
    }

    function handleCancel() {
        isAddApplicationOpen = false;
        appConfig = cancelEditorDraft();
        applyTheme(appConfig.theme);
    }

    function togglePm(type: PmType, id: string | number, domain: string, appName: string) {
        const result = toggleQueuedItem(type, id, domain, appName);

        showFeedback(result.key, result.action);
    }

    function toggleAllPm(pm: string) {
        const pmType = pm as PmType;
        toggleAllQueuedItems(appConfig.state, pmType);
    }

    async function handleImportLink() {
        const input = prompt("Paste the share link or #data= hash:");
        if (!input) return;
        await configActions.importFromLink(input);
    }

    function handleDownloadConfig() {
        configActions.downloadDraft(draftText);
    }

    async function handleGenerateShareLink() {
        await configActions.generateShareLink(draftText);
    }

    function handleReset() {
        configActions.reset();
    }

    async function handleFileUpload(e: Event) {
        const target = e.currentTarget as HTMLInputElement | null;
        const file = target?.files?.[0];
        if (!file) return;

        await configActions.importFromFile(file);

        if (target) target.value = '';
    }

    function handleCopyCommand(pmStr: string) {
        const pm = pmStr as PmType;
        const command = getQueuedCommand(pm);
        copyText(command).then(() => showAlert("Copied command!")).catch(() => showAlert("Failed to copy command."));
    }

    function handleClearQueue(pmStr: string) {
        const pm = pmStr as PmType;
        clearQueuedItems(pm);
    }
</script>

<svelte:head>
    <title>{appConfig.title}</title>
</svelte:head>

<PageShell
    title={appConfig.title} 
    sections={appConfig.state || []} 
    {isEditMode}
    globalPmItems={$pmItemsStore}
    {pmQueues}
    ontoggleEdit={toggleEditMode}
    ontoggleAllPm={toggleAllPm}
    ontriggerFileInput={() => fileInputRef?.click()}
    onimportLink={handleImportLink}
    ondownloadConfig={handleDownloadConfig}
    ongenerateShareLink={handleGenerateShareLink}
    onaddApplication={() => { isAddApplicationOpen = true; }}
    onreset={handleReset}
    oncopyPmCommand={handleCopyCommand}
    onclearPmQueue={handleClearQueue}
>

<input 
    type="file" 
    bind:this={fileInputRef} 
    accept=".md" 
    aria-hidden="true"
    style="position: absolute; width: 0; height: 0; opacity: 0; overflow: hidden; pointer-events: none;" 
    on:change={handleFileUpload} 
/>

{#if isEditMode}
    <Editor 
        bind:rawText={draftText}
        theme={appConfig.theme}
        {initialRawText}
        onupdateColor={handleUpdateColor}
        onchange={handleTextChange}
        onsave={handleSave}
        oncancel={handleCancel}
    />
{:else}
    <AppList sections={appConfig.state || []} {pmQueues} ontogglePm={togglePm} />
{/if}

{#if isEditMode && isAddApplicationOpen}
    <AddApplication
        rawText={draftText}
        onadd={handleAddApplication}
        oncancel={() => isAddApplicationOpen = false}
    />
{/if}
</PageShell>