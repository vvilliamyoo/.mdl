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
    <p id="editor-help" class="editor-help">Edit using the color pickers or text editor, then save your changes or cancel to discard them</p>
    <div class="editor-textarea-container">
        <textarea id="editor-area" aria-describedby="editor-help" bind:value={rawText} spellcheck="false" on:input={() => onchange(rawText)}></textarea>
        <details class="theme-picker">
            <summary id="theme-picker-toggle">Color Pickers</summary>
            <fieldset id="color-picker-bar">
                <legend class="visually-hidden">Theme colors</legend>
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
        </details>
        <button type="button" class="add-application-button" aria-label="Add app" title="Add app" on:click={() => onaddApplication()}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"></path>
            </svg>
        </button>
    </div>

    {#if rawText !== initialRawText}
        <div id="floating-action-bar">
            <span class="visually-hidden" role="status" aria-live="polite">Changes pending</span>
            <button type="button" id="save-changes-btn" aria-label="Save changes" title="Save changes" on:click={() => onsave()}>
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                    <path d="M4 3h13l4 4v14H3V3h1z"></path>
                    <path d="M7 3v6h10V3M7 21v-8h10v8"></path>
                </svg>
            </button>
            <button type="button" id="cancel-changes-btn" class="quiet-button" aria-label="Cancel changes" title="Cancel changes" on:click={() => oncancel()}>
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="m5.64 5.64 12.72 12.72"></path>
                </svg>
            </button>
        </div>
    {/if}
</div>