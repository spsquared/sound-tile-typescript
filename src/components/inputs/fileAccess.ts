const fileAccessAvailable = 'showOpenFilePicker' in window;

export async function openFilePicker(options?: OpenFilePickerOptions): Promise<File[]> {
    if (fileAccessAvailable) {
        try {
            const handles = await showOpenFilePicker(options);
            return await Promise.all(handles.map((handle) => handle.getFile()));
        } catch {
            return [];
        }
    } else {
        // fallback since showOpenFilePicker support is still somewhat spotty
        return await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = options?.types?.map((item) => Object.keys(item.accept as any).join(',')).join(',') ?? '';
            input.name = options?.id ?? 'soundtileUpload';
            input.onchange = (e) => {
                if (input.files !== null) resolve(Array.from(input.files));
                else resolve([]); // shouldn't happen
            };
            input.oncancel = () => {
                // no reject
                resolve([]);
            };
            input.click();
        });
    }
}

export async function saveFilePicker(options: SaveFilePickerOptions, data: Blob): Promise<boolean> {
    if (fileAccessAvailable) {
        try {
            const handle = await showSaveFilePicker(options);
            const writer = (await handle.createWritable()).getWriter();
            writer.ready.then(() => writer.write(data)).then(() => writer.close());
            return true;
        } catch {
            return false
        }
    } else {
        // fallback is a buh moment
        const a = document.createElement('a');
        a.download = options.suggestedName ?? 'download';
        a.href = URL.createObjectURL(data);
        a.click();
        return true;
    }
}