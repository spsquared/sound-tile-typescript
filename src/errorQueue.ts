import { reactive } from 'vue';

/**Global error queue */
namespace ErrorQueue {
    export type QueueEntry = (({
        type: 'error'
        message: string
    } & ({
        filename: string
        lineno: number
        colno: number
    } | {
        filename?: string
        lineno?: number
        colno?: number
    } | {
        stackTrace: string
    })) | {
        type: 'warning'
        message: string
        stackTrace?: string
    } | {
        type: 'notice'
        message: string
    }) & {
        title: string
    };
    export const queue: QueueEntry[] = reactive([]);
    export const MAX_QUEUE_LENGTH = 256;
    let lastQueueLengthWarning = -Infinity;

    export function error(e: ErrorEvent | Error | string, title?: string): void {
        if (queue.length >= MAX_QUEUE_LENGTH) {
            if (performance.now() - lastQueueLengthWarning > 10000) console.error(`MAXIMUM ERROR QUEUE LENGTH REACHED: ${MAX_QUEUE_LENGTH}\nCONSEQUENT ERRORS WILL NOT BE SHOWN.`);
            lastQueueLengthWarning = performance.now();
            console.debug(e);
        }
        if (e instanceof ErrorEvent) {
            queue.push({
                type: 'error',
                title: title ?? 'An error occurred',
                // stack trance will override the basic trace if it exists
                message: e.error instanceof Error ? `${e.error.name}: ${e.message}` : e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stackTrace: e.error instanceof Error ? e.error.stack : undefined
            });
        } else if (e instanceof Error) {
            queue.push({
                type: 'error',
                title: title ?? 'An error occurred',
                message: `${e.name}: ${e.message}`,
                stackTrace: e.stack
            });
        } else {
            queue.push({
                type: 'error',
                title: title ?? 'An error occurred',
                message: e
            });
        }
    }

    export function warn(e: Error | string, title?: string): void {
        if (queue.length >= MAX_QUEUE_LENGTH) {
            if (performance.now() - lastQueueLengthWarning > 10000) console.error(`MAXIMUM ERROR QUEUE LENGTH REACHED: ${MAX_QUEUE_LENGTH}\nCONSEQUENT ERRORS WILL NOT BE SHOWN.`);
            lastQueueLengthWarning = performance.now();
            console.debug(e);
        }
        if (e instanceof Error) {
            queue.push({
                type: 'warning',
                title: title ?? 'Something went wrong',
                message: `${e.name}: ${e.message}`,
                stackTrace: e.stack
            });
        } else {
            queue.push({
                type: 'error',
                title: title ?? 'Something went wrong',
                message: e
            });
        }
    }

    export function notice(message: string, title?: string): void {
        if (queue.length >= MAX_QUEUE_LENGTH) {
            if (performance.now() - lastQueueLengthWarning > 10000) console.error(`MAXIMUM ERROR QUEUE LENGTH REACHED: ${MAX_QUEUE_LENGTH}\nCONSEQUENT ERRORS WILL NOT BE SHOWN.`);
            lastQueueLengthWarning = performance.now();
            console.debug(message);
        }
        queue.push({
            type: 'notice',
            title: title ?? 'Notice',
            message: message
        });
    }
}

export default ErrorQueue;

// default log all uncaught stuff
window.addEventListener('error', (e) => ErrorQueue.error(e));
window.addEventListener('unhandledrejection', (e) => ErrorQueue.error('Unhandled Promise rejection: ' + (() => {
    if (e.reason != null) {
        if (e.reason.toString != Object.prototype.toString && typeof e.reason.toString == 'function') return e.reason.toString();
        return JSON.stringify(e.reason);
    }
    return e.reason;
})()));
