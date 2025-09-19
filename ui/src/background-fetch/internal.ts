import {
    BackgroundFetchFailureReason,
    BackgroundFetchManager,
    BackgroundFetchOptions,
    BackgroundFetchRecord,
    BackgroundFetchRegistration,
    BackgroundFetchResult,
} from '.'

export type ArgsMap = {
    fetch: [
        id: string,
        requests: RequestInfo | RequestInfo[],
        options?: BackgroundFetchOptions,
    ]
    get: [id: string]
    getIds: []
}

export type BackgroundFetchRPCRequest<T extends keyof ArgsMap> = {
    type: `background-fetch-polyfill:${T}`
    id: number
    args: ArgsMap[T]
}

export type ResponseMap = {
    fetch: BackgroundFetchRegistration
    get: BackgroundFetchRegistration | null
    getIds: string[]
}

export type BackgroundFetchRPCResponse<T extends keyof ResponseMap> = {
    type: `background-fetch-polyfill:${T}`
    id: number
} & (
    | {
          result?: undefined
          error: Error
      }
    | {
          result: ResponseMap[T]
          error?: undefined
      }
)

function isRPCResponse<T extends keyof ResponseMap>(
    v: unknown,
): v is BackgroundFetchRPCResponse<T> {
    return (
        typeof v === 'object' &&
        v !== null &&
        'type' in v &&
        typeof v.type === 'string' &&
        v.type.startsWith('background-fetch-polyfill:') &&
        'id' in v
    )
}

export class _BackgroundFetchManager implements BackgroundFetchManager {
    private static currentID: number = 0

    constructor(private readonly registration: ServiceWorkerRegistration) {}

    fetch(
        id: string,
        requests: RequestInfo | RequestInfo[],
        options?: BackgroundFetchOptions,
    ): Promise<BackgroundFetchRegistration> {
        return this.rpc('fetch', [id, requests, options])
    }
    get(id: string): Promise<BackgroundFetchRegistration | null> {
        return this.rpc('get', [id])
    }
    getIds(): Promise<string[]> {
        return this.rpc('getIds', [])
    }

    private rpc<T extends keyof ArgsMap & keyof ResponseMap>(
        name: T,
        args: ArgsMap[T],
    ): Promise<ResponseMap[T]> {
        if (!registration.active) {
            throw new Error('No active service worker')
        }

        const request: BackgroundFetchRPCRequest<T> = {
            type: `background-fetch-polyfill:${name}`,
            id: _BackgroundFetchManager.currentID++,
            args: args,
        }
        registration.active.postMessage(request)

        return new Promise<ResponseMap[T]>((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                const message: unknown = e.data
                if (
                    !isRPCResponse<T>(message) ||
                    message.type != request.type ||
                    message.id != request.id
                ) {
                    return
                }
                window.removeEventListener('message', handler)
                if (message.error) {
                    reject(message.error)
                } else {
                    resolve(message.result)
                }
            }

            window.addEventListener('message', handler)
        })
    }
}

export class _BackgroundFetchRegistration
    implements BackgroundFetchRegistration
{
    // readonly id: string
    readonly uploadTotal: number
    readonly uploaded: number
    // readonly downloadTotal: number
    readonly downloaded: number
    readonly result: BackgroundFetchResult
    readonly failureReason: BackgroundFetchFailureReason
    readonly recordsAvailable: boolean

    onprogress?: ((e: Event) => void) | undefined

    constructor(
        public readonly id: string,
        public readonly downloadTotal: number,
        private readonly signal: AbortSignal,
    ) {}

    abort(): Promise<boolean> {
        throw new Error('Method not implemented.')
    }
    match(
        request: RequestInfo,
        options?: CacheQueryOptions,
    ): Promise<BackgroundFetchRecord> {
        throw new Error('Method not implemented.')
    }
    matchAll(
        request?: RequestInfo,
        options?: CacheQueryOptions,
    ): Promise<Array<BackgroundFetchRecord>> {
        throw new Error('Method not implemented.')
    }
    addEventListener(
        type: unknown,
        callback?: unknown,
        capture?: unknown,
    ): void {
        throw new Error('Method not implemented.')
    }
    removeEventListener(
        type: unknown,
        callback?: unknown,
        capture?: unknown,
    ): void {
        throw new Error('Method not implemented.')
    }
    dispatchEvent(event: unknown): boolean {
        throw new Error('Method not implemented.')
    }
}
