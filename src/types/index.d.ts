interface Window {
    readonly documentPictureInPicture?: DocumentPictureInPicture
    readonly launchQueue?: {
        setConsumer(consumer: (launchParams: LaunchParams) => any): void
    }
}

interface LaunchParams {
    readonly files: readonly FileSystemHandle[]
    readonly targetURL: string
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
