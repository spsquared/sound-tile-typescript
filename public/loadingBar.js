let loaded = true;
window.addEventListener('DOMContentLoaded', () => {
    if (AudioContext == undefined) {
        document.getElementById('notSupported').style.display = 'block';
        return;
    }
    if (!loaded) return;
    document.getElementById('loadingCover').style.opacity = '0';
    window.onerror = null;
    setTimeout(() => {
        document.getElementById('loadingCover').remove();
    }, 200);
});

window.onerror = (_e, filename, lineno, colno, err) => {
    document.getElementById('loadingError').innerText += `\n${err?.message ?? 'Unexpected error'} (at ${filename} ${lineno}:${colno})`;
    loaded = false;
};