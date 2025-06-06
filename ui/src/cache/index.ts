import { Table } from 'dexie'
import EventTarget, { Event } from 'event-target-shim'
import { useEffect, useState } from 'preact/hooks'
import { bookAPI, seriesAPI, userBookAPI, userSeriesAPI } from 'src/api'
import { PaginatedRequest } from 'src/api/internal'
import { openToast } from 'src/components/toast'
import { DB, DBBook, DBSeries } from 'src/database'
import { useEventListener } from 'src/hooks/event-listener'
import { addRespondListener } from 'src/message'

import { Mutex } from 'async-mutex'
import 'src/cache/book'
import 'src/cache/series'

interface SyncManager {
    getTags(): Promise<string[]>
    register(tag: string): Promise<void>
}
declare global {
    interface ServiceWorkerRegistration {
        readonly sync: SyncManager
    }
}

export class UpdateEvent extends Event<'update'> {
    constructor(public readonly fromUserInteraction: boolean) {
        super('update')
    }
}

export type CacheEventMap = {
    update: UpdateEvent
}

export const cacheEventTarget = new EventTarget<CacheEventMap, 'strict'>()

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
        DB.fromNetwork(items),
        DB.lastUpdated.put({
            list: listName,
            updatedAt: new Date().toISOString(),
        }),
    ])
    invalidateCache(false)
}

export type CacheOptions<
    T extends DBSeries | DBBook,
    TRequest extends PaginatedRequest,
> = {
    listName: string
    request: TRequest
    table: Table<T>
    network: (req: TRequest) => Promise<T[]>
    cache: (req: TRequest) => Promise<T[]>
    promptReload?: 'always' | 'never' | 'auto'
    wait?: boolean
}

export function useCached<
    T extends DBSeries | DBBook,
    TRequest extends PaginatedRequest,
>({
    listName,
    request,
    table,
    network,
    cache,
    wait,
}: CacheOptions<T, TRequest>): T[] | null {
    const [items, setItems] = useState<T[] | null>(null)
    useEventListener(
        cacheEventTarget,
        'update',
        (_e: UpdateEvent) => {
            if (wait) {
                return
            }

            void cache(request).then(setItems)
        },
        [cache, ...Object.values(request), wait],
    )

    useEffect(() => {
        if (wait) {
            return
        }

        void cache(request).then(setItems)
        void updateList(listName, request, table, network)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listName, ...Object.values(request), table, network, cache, wait])

    useEventListener(
        document,
        'visibilitychange',
        () => {
            if (document.visibilityState === 'visible') {
                void updateList(listName, request, table, network)
            }
        },
        [listName, ...Object.values(request), table, network],
    )

    return items
}

const persistMtx = new Mutex()

export async function persist(
    fromUserInteraction: boolean,
    fromSyncEvent = false,
): Promise<void> {
    await persistMtx.runExclusive(async () => {
        invalidateCache(fromUserInteraction)
        const dirtyBooks = await DB.books.where('dirty').above(0).toArray()

        let hasErrors = false
        for (const b of dirtyBooks) {
            let result: Partial<DBBook> = {}
            try {
                if (b.update_map !== undefined) {
                    result = await bookAPI.update(b.id, {
                        title: b.title,
                        series_slug: b.series_slug,
                        chapter: b.chapter,
                        volume: b.volume,
                        rtl: b.rtl,
                        long_strip: b.long_strip,
                        pages: b.pages.map(p => ({
                            type: p.type,
                        })),
                        update_map: b.update_map,
                    })
                    result.dirty = 0
                }

                if (b.user_book?.update_map !== undefined) {
                    result.user_book = await userBookAPI.update(b.id, {
                        current_page: b.user_book.current_page,
                        update_map: b.user_book.update_map,
                    })
                    result.user_book.dirty = 0
                }
            } catch (_e) {
                hasErrors = true
            }
            if (Object.keys(result).length > 0) {
                await DB.books.update(b, result)
            }
        }
        const dirtySeries = await DB.series.where('dirty').above(0).toArray()

        for (const s of dirtySeries) {
            let result: Partial<DBSeries> = {}
            try {
                result = await seriesAPI.update(s.slug, {
                    name: s.name,
                    year: s.year,
                    aliases: s.aliases,
                    tags: s.tags,
                    genres: s.genres,
                    description: s.description,
                    metadata_id: s.metadata_id,
                    locked_fields: s.locked_fields,
                    update_map: s.update_map,
                })
                result.dirty = 0
                if (s.user_series !== null) {
                    try {
                        result.user_series = await userSeriesAPI.update(
                            s.slug,
                            {
                                list: s.user_series.list,
                                last_read_at: s.user_series.last_read_at,
                                update_map: s.user_series.update_map,
                            },
                        )
                    } catch (_e) {
                        hasErrors = true
                    }
                }
            } catch (_e) {
                hasErrors = true
            }
            if (Object.keys(result).length > 0) {
                await DB.series.update(s, result)
            }
        }
        invalidateCache(fromUserInteraction)

        if (hasErrors && !fromSyncEvent) {
            const registration = await navigator.serviceWorker.ready
            try {
                await registration.sync.register('persist')
            } catch {
                void openToast('There were some errors in syncing data')
            }
        }
    })
}

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

export async function deleteBook(
    b: DBBook,
    deleteFile = false,
    fromUserInteraction = false,
): Promise<void> {
    await bookAPI.remove(b.id, { file: deleteFile })
    await DB.books.delete(b.id)
    invalidateCache(fromUserInteraction)
}
