export class AsyncLock {
    private _locked = false;
    private readonly queue: (() => void)[] = [];

    constructor(locked: boolean = false) {
        // starting locked is useful for things like initialization
        this._locked = locked;
    }

    async acquire(): Promise<void> {
        if (this._locked) return new Promise<void>((resolve) => {
            this.queue.push(() => resolve());
        });
        this._locked = true;
    }

    release(): void {
        if (this.queue.length > 0) this.queue.shift()?.call(this);
        else this._locked = false;
    }

    get locked(): boolean {
        return this._locked;
    }
}
