<script lang="ts">
    import { DEFAULTS } from './utils.js';

    type ThemeColors = {
        background: string;
        window: string;
        text: string;
        accent: string;
    };

    export let rawText = '';
    export let theme: Partial<ThemeColors> = {};
    export let initialRawText = '';

    export let onupdateColor: (detail: { key: keyof ThemeColors; value: string }) => void = () => {};
    export let onchange: (text: string) => void = () => {};
    export let onsave: () => void = () => {};
    export let oncancel: () => void = () => {};

    function normalizeHex(color?: string, defaultHex = '#000000'): string {
        if (!color) return defaultHex;
        let c = color.trim();
        if (c.startsWith('#')) c = c.slice(1);
        if (c.length === 3) {
            c = c.split('').map(char => char + char).join('');
        }
        if (/^[0-9a-fA-F]{6}$/.test(c)) {
            return `#${c.toLowerCase()}`;
        }
        return defaultHex;
    }

    $: colorBg = normalizeHex(theme.background, DEFAULTS.theme.background);
    $: colorWin = normalizeHex(theme.window, DEFAULTS.theme.window);
    $: colorText = normalizeHex(theme.text, DEFAULTS.theme.text);
    $: colorAcc = normalizeHex(theme.accent, DEFAULTS.theme.accent);

    function handleInput(key: keyof ThemeColors, event: Event) {
        const target = event.currentTarget as HTMLInputElement | null;
        if (!target) return;
        const value = target.value ?? '';
        onupdateColor({ key, value });
    }
</script>

<div id="editor-container">
    <div id="theme-editor">
        <label>
            Background: 
            <input type="color" value={colorBg} on:input={(event) => handleInput('background', event)}>
        </label>
        <label>
            Window: 
            <input type="color" value={colorWin} on:input={(event) => handleInput('window', event)}>
        </label>
        <label>
            Text: 
            <input type="color" value={colorText} on:input={(event) => handleInput('text', event)}>
        </label>
        <label>
            Accent: 
            <input type="color" value={colorAcc} on:input={(event) => handleInput('accent', event)}>
        </label>
    </div>

    <textarea id="editor-area" bind:value={rawText} spellcheck="false" on:input={() => onchange(rawText)}></textarea>

    {#if rawText !== initialRawText}
        <div id="floating-action-bar">
            <span>You have unsaved changes</span>
            <button type="button" on:click={() => onsave()}>Save</button>
            <button type="button" id="cancel-changes-btn" on:click={() => oncancel()}>Cancel</button>
        </div>
    {/if}
</div>