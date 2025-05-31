interface Window {
    readonly documentPictureInPicture?: DocumentPictureInPicture
}

interface DocumentPictureInPicture {
    readonly window: Window
    requestWindow(options?: {
        width?: number,
        height?: number
        disallowReturnToOpener?: boolean,
        preferInitialWindowPlacement?: boolean
    }): Promise<Window>;
}
