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
    ['align-left', 'align-center', 'align-right', 'align-justified'].forEach((tag) => {
        Trix.config.blockAttributes[tag.substring(0, 5) + tag.charAt(6).toUpperCase() + tag.substring(7)] = {
            tagName: tag,
            // there's no way to just make it its own thing
            nestable: false,
            exclusive: true
        }
    });
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
                if (triggerUpdate) editor.activateAttribute('fontSize', `${currentValue / 10}em`);
            };
            // setting value when empty sets the value to 0
            input.addEventListener('blur', () => input.value != '' && setValue(Number(input.value)));
            input.addEventListener('keydown', (e) => {
                if (e.key == 'Enter') {
                    e.preventDefault(); // prevents trix from randomly typing all over the place
                    if (input.value != '') setValue(Number(input.value));
                    input.blur();
                }
            });
            decrement.addEventListener('click', () => setValue(Math.round(currentValue) - 1));
            increment.addEventListener('click', () => setValue(Math.round(currentValue) + 1));
            editorElement.addEventListener('trix-selection-change', () => {
                // not checking event target since this is the editor element
                if (!editor.attributeIsActive('fontSize')) {
                    // when creating new blocks fontSize is lost, wait is necessary because event is fired at weird time
                    setTimeout(() => setValue(currentValue));
                } else {
                    const attributes = editor.getDocument().getCommonAttributesAtRange(editor.getSelectedRange());
                    if ('fontSize' in attributes) setValue(Number(attributes.fontSize.toString().replace('em', '')) * 10, false);
                    else input.value = '';
                }
            });
            setValue(20);
        }
    });

    // screw attachments we dont want those
    document.addEventListener('trix-attachment-add', (e) => e.preventDefault());

    loaded.value = true;
    resolve();
});
export const trixLoaded = computed(() => loaded.value);
