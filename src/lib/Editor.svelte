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
    export let onaddApplication: () => void = () => {};
    export let onsave: () => void = () => {};
    export let oncancel: () => void = () => {};

    let isThemePickerOpen = false;

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
    <h2 class="editor-heading">Configuration Editor</h2>
    <p id="editor-help" class="editor-help">Edit using the color pickers or text editor, then save your changes or cancel to discard them.</p>
    <div class="editor-textarea-container" class:theme-picker-open={isThemePickerOpen}>
        <textarea id="editor-area" aria-describedby="editor-help" bind:value={rawText} spellcheck="false" on:input={() => onchange(rawText)}></textarea>
        <button
            type="button"
            id="theme-picker-toggle"
            aria-controls="theme-editor"
            aria-expanded={isThemePickerOpen}
            on:click={() => isThemePickerOpen = !isThemePickerOpen}
        >Color Pickers</button>
        <fieldset id="theme-editor">
            <legend class="visually-hidden">Color Pickers</legend>
            <label>
                <input type="color" value={colorAcc} on:input={(event) => handleInput('accent', event)}>
                Accent
            </label>
            <label>
                <input type="color" value={colorBg} on:input={(event) => handleInput('background', event)}>
                Background
            </label>
            <label>
                <input type="color" value={colorText} on:input={(event) => handleInput('text', event)}>
                Text
            </label>
            <label>
                <input type="color" value={colorWin} on:input={(event) => handleInput('window', event)}>
                Window
            </label>
        </fieldset>
        <button type="button" class="add-application-button" aria-label="Add app" title="Add app" on:click={() => onaddApplication()}>+</button>
    </div>

    {#if rawText !== initialRawText}
        <div id="floating-action-bar">
            <span role="status" aria-live="polite">You have unsaved changes</span>
            <button type="button" on:click={() => onsave()}>Save</button>
            <button type="button" id="cancel-changes-btn" class="quiet-button" on:click={() => oncancel()}>Cancel</button>
        </div>
    {/if}
</div>