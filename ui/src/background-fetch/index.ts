import EventTarget from 'event-target-shim'
import { _BackgroundFetchManager } from 'src/background-fetch/internal'

export type BackgroundFetchResult = '' | 'success' | 'failure'

export type BackgroundFetchFailureReason =
    // The background fetch has not completed yet, or was successful.
    | ''
    // The operation was aborted by the user, or abort() was called.
    | 'aborted'
    // A response had a not-ok-status.
    | 'bad-status'
    // A fetch failed for other reasons, e.g. CORS, MIX, an invalid partial response,
    // or a general network failure for a fetch that cannot be retried.
    | 'fetch-error'
    // Storage quota was reached during the operation.
    | 'quota-exceeded'
    // The provided downloadTotal was exceeded.
    | 'download-total-exceeded'
export interface BackgroundFetchManager {
    fetch(
        id: string,
        requests: RequestInfo | RequestInfo[],
        options?: BackgroundFetchOptions,
    ): Promise<BackgroundFetchRegistration>
    get(id: string): Promise<BackgroundFetchRegistration | null>
    getIds(): Promise<string[]>
}

export interface BackgroundFetchRegistration extends EventTarget {
    readonly id: string
    readonly uploadTotal: number
    readonly uploaded: number
    readonly downloadTotal: number
    readonly downloaded: number
    readonly result: BackgroundFetchResult
    readonly failureReason: BackgroundFetchFailureReason
    readonly recordsAvailable: boolean

    onprogress?: (e: Event) => void

    abort(): Promise<boolean>
    match(
        request: RequestInfo,
        options?: CacheQueryOptions,
    ): Promise<BackgroundFetchRecord>
    matchAll(
        request?: RequestInfo,
        options?: CacheQueryOptions,
    ): Promise<Array<BackgroundFetchRecord>>
}
export interface BackgroundFetchRecord {
    readonly request: Request
    readonly responseReady: Promise<Response>
}

export interface BackgroundFetchUIOptions {
    icons?: Array<ImageResource>
    title?: string
}
export interface BackgroundFetchOptions extends BackgroundFetchUIOptions {
    downloadTotal?: number
}
export interface ImageResource {
    src: string
    sizes?: string
    type?: string
    label?: string
}

export async function backgroundFetch(): Promise<BackgroundFetchManager> {
    const swReg: ServiceWorkerRegistration = navigator.serviceWorker
        ? await navigator.serviceWorker.ready
        : registration

    if ('backgroundFetch' in swReg) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return swReg.backgroundFetch
    }
    return new _BackgroundFetchManager(swReg)
}
