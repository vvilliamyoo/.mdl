<script lang="ts">
    import { onMount } from 'svelte';
    import Header from './lib/Header.svelte';
    import Editor from './lib/Editor.svelte';
    import PmBar from './lib/PmBar.svelte';
    import {
        DEFAULTS, PACKAGE_MANAGERS, initBrotli, parseConfig,
        buildAppState, getFaviconUrl, sanitizeURL,
        isValidConfigStructure, isValidHex, base64UrlToBytes, bytesToBase64Url
    } from './lib/utils.js';

    type QueueItem = { id: string | number; domain: string; appName: string };
    type PmType = 'winget' | 'choco' | 'apt';

    type AppItem = {
        name: string;
        domain?: string;
        url: string;
        chipHtml: string;
        pmData: Array<{ type: string; id: string | number }>;
    };

    type AppConfig = {
        theme: {
            background?: string;
            window?: string;
            text?: string;
            accent?: string;
            sansFont?: string;
            monoFont?: string;
        };
        markdown: string;
        title: string;
        rawText: string;
        state?: Array<{ letter: string; apps: AppItem[] }>;
    };

    type PackageQueue = Map<string | number, QueueItem>;

    let appConfig: AppConfig = {
        theme: DEFAULTS.theme,
        markdown: '',
        title: DEFAULTS.title,
        rawText: ''
    };

    let isEditMode = false;
    let initialRawText = '';
    let fileInputRef: HTMLInputElement | null = null;

    let pmQueues: Record<string, PackageQueue> = {
        winget: new Map(),
        choco: new Map(),
        apt: new Map()
    };

    let pmFeedback: Record<string, string | null> = {};
    let pmTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

    const pmTypes = Object.keys(PACKAGE_MANAGERS) as PmType[];

    onMount(async () => {
        const hash = window.location.hash;
        if (hash.startsWith('#data=')) {
            try {
                const brotli = await initBrotli();
                const compressedBytes = base64UrlToBytes(hash.substring(6));
                const decompressedBytes = brotli.decompress(compressedBytes);
                const minifiedText = new TextDecoder().decode(decompressedBytes);
                if (minifiedText) {
                    appConfig = parseConfig(minifiedText);
                    localStorage.setItem('mdl_full_data', JSON.stringify(appConfig));
                    window.history.replaceState(null, '', window.location.pathname);
                }
            } catch (e) {
                console.error("Failed to parse URL config with Brotli", e);
            }
        }

        if (!appConfig.markdown) {
            const saved = localStorage.getItem('mdl_full_data');
            if (saved) {
                try {
                    appConfig = JSON.parse(saved);
                } catch (e) {
                    localStorage.removeItem('mdl_full_data');
                }
            }
            if (!appConfig.markdown) {
                try {
                    const res = await fetch(`${(import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL}config.md`);
                    if (res.ok) {
                        const text = await res.text();
                        appConfig = parseConfig(text);
                    } else {
                        console.error("Failed to load config.md:", res.status, res.statusText);
                    }
                } catch (err) {
                    console.error("Error loading config.md", err);
                }
            }
        }
        appConfig.state = buildAppState(appConfig.markdown);
        applyTheme(appConfig.theme);
    });

    function applyTheme(theme: AppConfig['theme']) {
        if (!theme) return;
        const root = document.documentElement;
        const bg = String((isValidHex(theme.background) && theme.background) ? theme.background : (DEFAULTS.theme.background ?? '#000000'));
        const win = String((isValidHex(theme.window) && theme.window) ? theme.window : (DEFAULTS.theme.window ?? '#111827'));
        const txt = String((isValidHex(theme.text) && theme.text) ? theme.text : (DEFAULTS.theme.text ?? '#f8fafc'));
        const acc = String((isValidHex(theme.accent) && theme.accent) ? theme.accent : (DEFAULTS.theme.accent ?? '#7dd3fc'));
        const sans = String((theme.sansFont && theme.sansFont.trim()) || (DEFAULTS.theme.sansFont ?? 'system-ui, sans-serif'));
        const mono = String((theme.monoFont && theme.monoFont.trim()) || (DEFAULTS.theme.monoFont ?? 'ui-monospace, SFMono-Regular, monospace'));

        root.style.setProperty('--background-color', bg);
        root.style.setProperty('--window-color', win);
        root.style.setProperty('--text-color', txt);
        root.style.setProperty('--accent-color', acc);
        root.style.setProperty('--button-text-color', txt);
        root.style.setProperty('--sans-font', sans);
        root.style.setProperty('--mono-font', mono);
    }

    function toggleEditMode() {
        if (isEditMode && appConfig.rawText !== initialRawText) {
            alert("Please save or cancel unsaved changes");
            return;
        }
        
        isEditMode = !isEditMode;
        if (isEditMode) {
            initialRawText = appConfig.rawText;
        } else {
            applyTheme(appConfig.theme);
        }
    }

    function handleTextChange(text: string) {
        const parsed = parseConfig(text);
        const newState = buildAppState(parsed.markdown);
        appConfig = {
            ...appConfig,
            rawText: text,
            theme: parsed.theme,
            markdown: parsed.markdown,
            title: parsed.title,
            state: newState
        };
        applyTheme(parsed.theme);
    }

    function handleUpdateColor({ key, value }: { key: string; value: string }) {
        let text = appConfig.rawText;
        const frontmatterRegex = /^\s*---\s*([\s\S]*?)\s*---/;
        const match = text.match(frontmatterRegex);

        if (match) {
            const fullMatch = match[0];
            const fmContent = match[1];

            const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const keyRegex = new RegExp(`^(\\s*${safeKey}\\s*:).*$`, 'm');

            let newFmContent: string;
            if (keyRegex.test(fmContent)) {
                newFmContent = fmContent.replace(keyRegex, `$1 ${value}`);
            } else {
                newFmContent = fmContent.trimEnd() + `\n${key}: ${value}\n`;
            }

            text = text.replace(fullMatch, () => fullMatch.replace(fmContent, () => newFmContent));
        } else {
            text = `---\n${key}: ${value}\n---\n\n` + text;
        }

        handleTextChange(text);
    }

    function handleSave() {
        const validation = isValidConfigStructure(appConfig.rawText);
        if (!validation.valid) {
            alert(`Save Failed: ${validation.error}`);
            return;
        }
        appConfig = parseConfig(appConfig.rawText);
        localStorage.setItem('mdl_full_data', JSON.stringify(appConfig));
        appConfig.state = buildAppState(appConfig.markdown);
        alert("All changes saved to browser memory");
        
        initialRawText = appConfig.rawText;
        toggleEditMode();
    }

    function handleCancel() {
        handleTextChange(initialRawText);
    }

    function togglePm(type: string, id: string | number, domain: string, appName: string) {
        const queue = pmQueues[type];
        const key = `${type}-${id}`;

        if (queue.has(id)) {
            queue.delete(id);
            pmFeedback[key] = "Removed";
        } else {
            queue.set(id, { id, domain, appName });
            pmFeedback[key] = "Added";
        }
        pmQueues = { ...pmQueues };
        pmFeedback = { ...pmFeedback };

        if (pmTimeouts[key]) clearTimeout(pmTimeouts[key]);

        pmTimeouts[key] = setTimeout(() => {
            pmFeedback[key] = null;
            pmFeedback = { ...pmFeedback };
        }, 2000);
    }

    function getAllPmItems(pmType: PmType): QueueItem[] {
        if (!appConfig.state) return [];
        return appConfig.state.flatMap(sec => 
            sec.apps
                .filter(app => app.pmData.some(p => p.type === pmType))
                .map(app => {
                    const match = app.pmData.find(p => p.type === pmType)!;
                    return { id: match.id, domain: app.domain ?? '', appName: app.name };
                })
        );
    }

    function toggleAllPm(pm: string) {
        const pmType = pm as PmType;
        const allItems = getAllPmItems(pmType);
        const queue = pmQueues[pmType];

        const areAllAdded = allItems.length > 0 && allItems.every(item => queue.has(item.id));

        allItems.forEach(item => {
            if (areAllAdded) {
                queue.delete(item.id);
            } else {
                queue.set(item.id, item);
            }
        });

        pmQueues = { ...pmQueues };
    }

    function handleImportLink() {
        const input = prompt("Paste the share link or #data= hash:");
        if (!input) return;
        let hashData = input.trim();
        if (hashData.includes('#data=')) {
            hashData = hashData.split('#data=')[1];
        }
        if (hashData.startsWith('data=')) {
            hashData = hashData.substring(5);
        }
        try {
            initBrotli().then(async (brotli: any) => {
                const compressedBytes = base64UrlToBytes(hashData);
                const decompressedBytes = brotli.decompress(compressedBytes);
                const text = new TextDecoder().decode(decompressedBytes);
                if (text) {
                    handleTextChange(text);
                    alert("Config imported from link! Click 'Save' to apply.");
                }
            });
        } catch (e) {
            console.error("Failed to import from link", e);
            alert("Invalid share link or hash.");
        }
    }

    function handleDownloadConfig() {
        const blob = new Blob([appConfig.rawText], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.md';
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleGenerateShareLink() {
        try {
            const brotli = await initBrotli();
            const textBytes = new TextEncoder().encode(appConfig.rawText);
            const compressed = brotli.compress(textBytes);
            const base64 = bytesToBase64Url(compressed);
            const url = `${window.location.origin}${window.location.pathname}#data=${base64}`;
            await navigator.clipboard.writeText(url);
            alert("Share link copied to clipboard!");
        } catch (e) {
            console.error("Failed to generate share link", e);
            alert("Failed to generate share link.");
        }
    }

    function handleReset() {
        if (confirm("Reset everything?")) { 
            localStorage.removeItem('mdl_full_data'); 
            location.reload(); 
        }
    }

    function handleFileUpload(e: Event) {
        const target = e.currentTarget as HTMLInputElement | null;
        const file = target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
            if (!text) return;
            handleTextChange(text);
            alert("Config imported! Click 'Save' to apply.");
        };
        reader.readAsText(file);
        if (target) target.value = '';
    }

    function handleCopyCommand(pmStr: string) {
        const pm = pmStr as PmType;
        const command = `${PACKAGE_MANAGERS[pm]} ${Array.from(pmQueues[pm].keys()).join(' ')}`;
        navigator.clipboard?.writeText(command).then(() => alert("Copied command!"));
    }

    function handleClearQueue(pmStr: string) {
        const pm = pmStr as PmType;
        pmQueues[pm].clear();
        pmQueues = { ...pmQueues };
    }
</script>

<svelte:head>
    <title>{appConfig.title}</title>
</svelte:head>

<Header 
    title={appConfig.title} 
    sections={appConfig.state || []} 
    {isEditMode}
    globalPmItems={Object.fromEntries(pmTypes.map(pm => [pm, getAllPmItems(pm)]))}
    {pmQueues}
    ontoggleEdit={toggleEditMode}
    ontoggleAllPm={toggleAllPm}
    ontriggerFileInput={() => fileInputRef?.click()}
    onimportLink={handleImportLink}
    ondownloadConfig={handleDownloadConfig}
    ongenerateShareLink={handleGenerateShareLink}
    onreset={handleReset}
/>

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
        bind:rawText={appConfig.rawText} 
        theme={appConfig.theme}
        {initialRawText}
        onupdateColor={handleUpdateColor}
        onchange={handleTextChange}
        onsave={handleSave}
        oncancel={handleCancel}
    />
{:else}
    <div id="content">
        {#each appConfig.state || [] as section}
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
                            {@const isAdded = pmQueues[pm.type]?.has(pm.id)}
                            {@const feedback = pmFeedback[`${pm.type}-${pm.id}`]}
                            
                            <button type="button" class="cmd-btn {isAdded ? 'filled' : ''}" on:click={() => togglePm(pm.type, pm.id, app.domain ?? '', app.name)}>
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
{/if}

{#if !isEditMode}
    <PmBar 
        {pmQueues} 
        oncopy={handleCopyCommand} 
        onclear={handleClearQueue} 
    />
{/if}