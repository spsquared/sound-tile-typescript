import { computed, ref } from 'vue';

const loaded = ref(false);
export const trixLoadPromise: Promise<void> = new Promise<void>(async (resolve) => {
    import('trix/dist/trix.css');
    import('@/assets/trix.css');

    const trixImport = import('trix');
    const html = (await import('@/assets/trixToolbar.html?raw')).default;
    const Trix = (await trixImport).default;

    Trix.config.textAttributes.fontSize = {
        styleProperty: 'font-size',
        inheritable: true
    };
    Trix.config.textAttributes.underline = {
        style: { textDecoration: 'underline' },
        parser: (el: HTMLElement) => el.style.textDecoration == 'underline',
        inheritable: true
    };
    Trix.config.toolbar.getDefaultHTML = () => html;

    // no easy way to add things like colors and font size so this is how we do it then
    document.addEventListener('trix-initialize', (e) => {
        const editor = (e as TrixEvent).target?.editorController.editor;
        const editorElement = editor?.element;
        const toolbarElement = document.getElementById(editor?.element.getAttribute('toolbar') ?? '');
        if (editor === undefined || editorElement === undefined || toolbarElement === null) {
            console.warn('Failed to properly initialize Trix editor custom controls');
            return;
        }
        // attribute syncing
        const commonAttributeListeners: Set<(attr: Trix.AttributeRecord) => any> = new Set();
        // font SIZE
        fontSize: {
            const input = toolbarElement.querySelector('.trix-x-size-input') as HTMLInputElement;
            const decrement = toolbarElement.querySelector('.trix-x-size-decrement') as HTMLButtonElement;
            const increment = toolbarElement.querySelector('.trix-x-size-increment') as HTMLButtonElement;
            if ([input, decrement, increment].some((e) => e === null)) {
                console.warn('Failed to initialize Trix editor font size controls');
                break fontSize;
            };
            let currentValue = 1;
            const setValue = (v: number, triggerUpdate: boolean = true) => {
                if (!isFinite(v)) v = currentValue;
                currentValue = Math.max(5, Math.min(1000, Math.round(v * 10))) / 10;
                input.value = '' + currentValue;
                if (triggerUpdate) editor.activateAttribute('fontSize', currentValue + 'em');
            }
            input.addEventListener('blur', () => setValue(Number(input.value)));
            input.addEventListener('keydown', (e) => e.key == 'Enter' && setValue(Number(input.value)));
            decrement.addEventListener('click', () => setValue(Math.round(currentValue) - 1));
            increment.addEventListener('click', () => setValue(Math.round(currentValue) + 1));
            commonAttributeListeners.add((attributes) => {
                if ('fontSize' in attributes) setValue(Number(attributes.fontSize.toString().replace('em', '')), false);
                else input.value = '';
            });
            setValue(20);
        }
        editorElement.addEventListener('trix-selection-change', () => {
            // not checking event target since this is the editor element
            const attributes = editor.getDocument().getCommonAttributesAtRange(editor.getSelectedRange());
            for (const cb of commonAttributeListeners) {
                try { cb(attributes) } catch (err) { console.error(err); }
            }
        });
    });
    // document.addEventListener('trix-action-invoke', (e: any) => {
    //     const { target, invokingElement, action } = e as TrixEvent;
    //     switch (action) {

    //     }
    // });

    // screw attachments we dont want those
    document.addEventListener('trix-attachment-add', (e) => e.preventDefault());

    loaded.value = true;
    resolve();
});
export const trixLoaded = computed(() => loaded.value);
