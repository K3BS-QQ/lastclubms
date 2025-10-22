// /js/utils.js

export async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        return await res.json();
    } catch (err) {
        console.error(err);
        return { success: false, message: 'Request failed.' };
    }
}

export function confirmAction(msg) {
    return confirm(msg);
}

export function promptValue(msg, defaultVal='') {
    const val = prompt(msg, defaultVal);
    return val === null ? null : val.trim();
}
