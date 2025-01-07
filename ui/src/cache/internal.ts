import { useEffect, useState } from 'preact/hooks'
import { PaginatedRequest } from 'src/api/internal'
import { openToast } from 'src/components/toast'

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

export function usePromptUpdate<T>(
    message: string,
    liveValues: T[] | null | undefined,
): T[] | null {
    const [values, setValues] = useState(liveValues)
    useEffect(() => {
        let closed = false
        void (async () => {
            let reload = false
            if (!isArrayBlank(values)) {
                reload =
                    (await openToast(
                        message,
                        { reload: true },
                        0,
                        'reload-prompt',
                    )) ?? false
            }

            if (closed) {
                return
            }
            if (reload) {
                setValues(liveValues)
            }
        })()
        return () => {
            closed = true
        }
    }, [liveValues, values, message])
    return values ?? null
}

function isArrayBlank<T>(arr: T[] | undefined | null): arr is T[] {
    return arr !== undefined && arr !== null && arr.length > 0
}

// function primaryKeyValue(item: DBSeries | DBBook): string {
//     if (typeof item === 'object' && item !== null) {
//         if ('id' in item) {
//             return item.id
//         }
//         if ('name' in item) {
//             return item.name
//         }
//     }
//     return JSON.stringify(item)
// }

// function shouldPrompt<T>(cacheItems: T[], netItems: T[]): boolean {
//     if (cacheItems.length === 0) {
//         return false
//     }
//     if (cacheItems.length < netItems.length) {
//         return true
//     }

//     const netKeys = netItems.map(primaryKeyValue)
//     const cacheKeys = netItems.map(primaryKeyValue)
//     for (const key of netKeys) {
//         if (cacheKeys.indexOf(key) === -1) {
//             return true
//         }
//     }
//     return false
// }
