import 'trix/dist/trix.css';
import '@/assets/trix.css';

// buh trix huge
import Trix from 'trix';

(async () => {
    const html = (await import('@/assets/trixToolbar.html?raw')).default;

    window.addEventListener('trix-before-initialize', async () => {
        Trix.config.textAttributes.fontSize = {
            styleProperty: 'font-size',
            inheritable: 1
        };
        Trix.config.toolbar.getDefaultHTML = () => html;
    });

    // screw attachments we dont want those
    window.addEventListener('trix-attachment-add', (e) => e.preventDefault());
})();

export default {};