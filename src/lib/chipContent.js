/**
 * @param {string} value
 * @returns {string}
 */
function escapeHTML(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Convert recognized tags to chip markup and escape all other config text.
 * @param {string} tagsText
 * @param {Record<string, string>} packageManagers
 * @returns {{ tags: string[], pmData: Array<{ type: string, id: string }>, chipHtml: string }}
 */
export function buildChipContent(tagsText, packageManagers) {
    const tagRegex = /#(\w+)|#\[(.*?)\]/g;
    /** @type {string[]} */
    const tags = [];
    /** @type {Array<{ type: string, id: string }>} */
    const pmData = [];
    let lastTagEnd = 0;
    let chipHtml = '';

    for (const match of tagsText.matchAll(tagRegex)) {
        const offset = match.index ?? 0;
        const matchedTag = match[0];
        const tag = match[1] || match[2];
        chipHtml += escapeHTML(tagsText.slice(lastTagEnd, offset));
        lastTagEnd = offset + matchedTag.length;

        const pmMatch = tag.match(/^([^:]+):(.+)$/);
        if (pmMatch && packageManagers[pmMatch[1]]) {
            const type = pmMatch[1];
            const id = pmMatch[2].trim();
            pmData.push({ type, id });
            tags.push(type);
            chipHtml += `<span class="chip">${escapeHTML(type)}</span>`;
        } else {
            tags.push(tag);
            chipHtml += `<span class="chip">${escapeHTML(tag)}</span>`;
        }
    }

    chipHtml += escapeHTML(tagsText.slice(lastTagEnd));
    return { tags, pmData, chipHtml };
}
