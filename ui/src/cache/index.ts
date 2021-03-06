import { Table } from 'dexie'
import EventTarget, { Event } from 'event-target-shim'
import { useEffect, useState } from 'preact/hooks'
import { book, series, userBook, userSeries } from '../api'
import { PaginatedRequest } from '../api/internal'
import { prompt } from '../components/alert'
import { DB, DBBook, DBSeries } from '../database'
import { debounce } from '../debounce'
import { useEventListener } from '../hooks/event-listener'
import { addRespondListener } from '../message'
import './book'
import { getCacheHandler } from './internal'
import './series'

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

addRespondListener('book-update', () => invalidateCache(false))

export async function updateList<
    T extends DBSeries | DBBook,
    TRequest extends PaginatedRequest,
>(
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
        with_deleted: true,
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

export function useCached<
    T extends DBSeries | DBBook,
    TRequest extends PaginatedRequest,
>(
    listName: string,
    request: TRequest,
    table: Table<T>,
    network: (req: TRequest) => Promise<T[]>,
    promptReload: 'always' | 'never' | 'auto' = 'auto',
): T[] | null {
    const [items, setItems] = useState<T[] | null>(null)
    const cache = getCacheHandler(network)
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
                    (await prompt(
                        'New ' + table.name,
                        { reload: true },
                        0,
                        'reload-prompt',
                    )) ?? false
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setItems, listName, ...Object.values(request), table, network, cache])

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

export const persist = debounce(async function (
    fromUserInteraction: boolean,
): Promise<void> {
    invalidateCache(fromUserInteraction)
    const dirtyBooks = await DB.books.where('dirty').notEqual(0).toArray()
    let hasErrors = false
    for (const b of dirtyBooks) {
        let result = b
        if (b.user_book !== null && b.user_book.dirty) {
            try {
                b.user_book = await userBook.update(b.id, {
                    current_page: b.user_book.current_page,
                    update_map: b.user_book.update_map ?? {},
                })
            } catch (e) {
                hasErrors = true
            }
        }
        if (b.dirty === 1) {
            try {
                result = await book.update(b.id, {
                    title: b.title,
                    series: b.series,
                    chapter: b.chapter,
                    volume: b.volume,
                    rtl: b.rtl,
                    pages: b.pages.map(p => ({
                        type: p.type,
                    })),
                    update_map: b.update_map ?? {},
                })
            } catch (e) {
                hasErrors = true
            }
        }
        DB.books.put({
            ...result,
            dirty: 0,
        })
    }
    const dirtySeries = await DB.series.where('dirty').notEqual(0).toArray()
    for (const s of dirtySeries) {
        let result = s
        try {
            result = await series.update(s.name, {
                anilist_id: s.anilist_id,
                update_map: s.update_map,
            })
        } catch (e) {
            hasErrors = true
        }
        if (s.user_series !== null) {
            try {
                result.user_series = await userSeries.update(s.name, {
                    list: s.user_series.list,
                    update_map: s.user_series.update_map,
                })
            } catch (e) {
                hasErrors = true
            }
        }
        await DB.series.update(s, {
            ...result,
            dirty: 0,
        })
    }
    invalidateCache(fromUserInteraction)

    if (hasErrors) {
        prompt('There were some errors in syncing data')
    }
},
500)

export function useOnline(): boolean {
    const [online, setOnline] = useState(navigator.onLine)
    useEffect(() => {
        const setOnlineTrue = () => setOnline(true)
        const setOnlineFalse = () => setOnline(false)

        window.addEventListener('online', setOnlineTrue)
        window.addEventListener('offline', setOnlineFalse)
        return () => {
            window.removeEventListener('online', setOnlineTrue)
            window.removeEventListener('offline', setOnlineFalse)
        }
    }, [setOnline])

    return online
}
