const trixModule = import('trix');

document.addEventListener('trix-before-initialize', async () => {
    // trix hopefully loads before this event fires or something will be very off
    const Trix = (await trixModule).default;
    Trix
});