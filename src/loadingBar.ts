let loaded = true;
window.addEventListener('load', (e) => {
    if (AudioContext == undefined) {
        document.getElementById('notSupported')!.style.display = 'block';
        return;
    }
    if (window.documentPictureInPicture == undefined || !window.isSecureContext) {
        (document.getElementById('pipButton') as HTMLInputElement).disabled = true;
    }
    if (!loaded) return;
    document.getElementById('loadingCover')!.style.opacity = '0';
    window.onerror = null;
    setTimeout(() => {
        document.getElementById('loadingCover')!.remove();
    }, 200);
});

window.onerror = (e, filename, lineno, colno, err) => {
    document.getElementById('loadingError')!.innerText += `\n${err?.message ?? 'Unexpected error'} (at ${filename} ${lineno}:${colno})`;
    loaded = false;
};