import { PaginatedRequest } from '../api/internal'

const cacheMap = new Map<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req: any) => Promise<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req: any) => Promise<any>
>()

export function setCacheHandler<T, TRequest extends PaginatedRequest>(
    network: (req: TRequest) => Promise<T[]>,
    cache: (req: TRequest) => Promise<T[]>,
): void {
    cacheMap.set(network, cache)
}
export function getCacheHandler<T, TRequest extends PaginatedRequest>(
    network: (req: TRequest) => Promise<T[]>,
): (req: TRequest) => Promise<T[]> {
    const handler = cacheMap.get(network)
    if (handler === undefined) {
        throw new Error('no cache handler for the given network handler')
    }
    return handler
}
