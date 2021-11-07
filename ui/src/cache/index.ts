import { Table } from 'dexie'
import EventTarget, { Event } from 'event-target-shim'
import { useEffect, useState } from 'preact/hooks'
import { book, userBook, userSeries } from '../api'
import { PaginatedRequest } from '../api/internal'
import { prompt } from '../components/alert'
import { DB, DBModel } from '../database'
import { useEventListener } from '../hooks/event-listener'
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

export async function updateList<
    T extends DBModel,
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

export async function persist(fromUserInteraction: boolean): Promise<void> {
    const dirtyBooks = await DB.books.where('clean').equals(0).toArray()
    for (const b of dirtyBooks) {
        if (b.user_book !== null) {
            await userBook.update(b.id, {
                current_page: b.user_book.current_page,
                update_map: b.user_book.update_map ?? {},
            })
        }
        const result = await book.update(b.id, {
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
        DB.books.put({
            ...result,
            clean: 1,
        })
    }
    const dirtySeries = await DB.series.where('clean').equals(0).toArray()
    for (const s of dirtySeries) {
        if (s.user_series !== null) {
            const us = await userSeries.update(s.name, {
                list: s.user_series.list,
            })
            DB.series.update(s, { user_series: us, clean: 1 })
        }
    }
    invalidateCache(fromUserInteraction)
}
