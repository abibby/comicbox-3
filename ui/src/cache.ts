import { Table } from 'dexie'
import EventTarget, { Event } from 'event-target-shim'
import { useEffect, useState } from 'preact/hooks'
import { PaginatedRequest } from './api/internal'
import { prompt } from './components/alert'
import { DB } from './database'
import { useEventListener } from './hooks/event-listener'

class UpdateEvent extends Event<'update'> {
    constructor(public readonly fromUserInteraction: boolean) {
        super('update')
    }
}

type CacheEventMap = {
    update: UpdateEvent
}

const cacheEventTarget = new EventTarget<CacheEventMap, 'strict'>()

export function invalidateCache(fromUserInteraction: boolean): void {
    cacheEventTarget.dispatchEvent(new UpdateEvent(fromUserInteraction))
}

export async function updateList<T, TRequest extends PaginatedRequest>(
    listName: string,
    request: TRequest,
    table: Table<T>,
    network: (req: TRequest) => Promise<T[]>,
): Promise<void> {
    listName = `${table.name}:${listName}`
    const lastUpdated = await DB.lastUpdated
        .where('list')
        .equals(listName)
        .first()

    const items = await network({
        ...request,
        updated_after: lastUpdated?.updatedAt,
    })

    await Promise.all([
        DB.fromNetwork(table, items),
        DB.lastUpdated.put({
            list: listName,
            updatedAt: new Date().toISOString(),
        }),
    ])
    invalidateCache(false)
}

export function useCached<T, TRequest extends PaginatedRequest>(
    listName: string,
    request: TRequest,
    table: Table<T>,
    network: (req: TRequest) => Promise<T[]>,
    cache: (req: TRequest) => Promise<T[]>,
    promptReload: 'always' | 'never' | 'auto' = 'auto',
): T[] | null {
    const [items, setItems] = useState<T[] | null>(null)

    useEventListener(
        cacheEventTarget,
        'update',
        async (e: UpdateEvent) => {
            const newItems = await cache(request)
            let reload = true

            if (
                promptReload === 'always' ||
                (promptReload === 'auto' &&
                    e.fromUserInteraction === false &&
                    items !== null &&
                    shouldPrompt(items, newItems))
            ) {
                reload =
                    (await prompt('New ' + table.name, { reload: true }, 0)) ??
                    false
            }
            if (reload) {
                setItems(newItems)
            }
        },
        [table.name, setItems, items, cache],
    )

    useEffect(() => {
        cache(request).then(setItems)
        updateList(listName, request, table, network)
    }, [setItems, listName, ...Object.values(request), table, network])

    return items
}

function primaryKeyValue(item: unknown): unknown {
    if (typeof item === 'object' && item !== null) {
        if ('id' in item) {
            return (item as { id: unknown }).id
        }
        if ('name' in item) {
            return (item as { name: unknown }).name
        }
    }
    return JSON.stringify(item)
}

function shouldPrompt<T>(cacheItems: T[], netItems: T[]): boolean {
    if (cacheItems.length === 0) {
        return false
    }
    if (cacheItems.length < netItems.length) {
        return true
    }

    const netKeys = netItems.map(primaryKeyValue)
    const cacheKeys = netItems.map(primaryKeyValue)
    for (const key of netKeys) {
        if (cacheKeys.indexOf(key) === -1) {
            return true
        }
    }
    return false
}
