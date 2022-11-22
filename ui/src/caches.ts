import EventTarget, { Event } from 'event-target-shim'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { useAsync } from 'src/hooks/async'
import { Message } from 'src/message'
import { Book } from 'src/models'

export const STATIC_CACHE_NAME = 'static-cache-v1'
export const THUMB_CACHE_NAME = 'image-cache-v1'
export const PAGE_CACHE_PREFIX = 'page-cache-v1-'

class LocalMessageEvent extends Event<'message'> {
    constructor(public readonly data: Message) {
        super('message')
    }
}
type EventMap = {
    message: LocalMessageEvent
}
const cacheEventListener = new EventTarget<EventMap, 'strict'>()

export function openStaticCache(): Promise<Cache> {
    return caches.open(STATIC_CACHE_NAME)
}

export function openThumbCache(): Promise<Cache> {
    return caches.open(THUMB_CACHE_NAME)
}

export function pageCacheID(bookID: string): string {
    return PAGE_CACHE_PREFIX + bookID
}

export async function openPageCache(bookID: string): Promise<Cache> {
    return caches.open(pageCacheID(bookID))
}

export function hasPageCache(bookID: string): Promise<boolean> {
    return caches.has(pageCacheID(bookID))
}

export async function removeBookCache(bookID: string): Promise<void> {
    await caches.delete(PAGE_CACHE_PREFIX + bookID)
    const message: Message = {
        type: 'download',
        downloadType: 'removed',
        id: bookID,
        model: 'book',
    }
    cacheEventListener.dispatchEvent(new LocalMessageEvent(message))
}

export function useBookCached(
    book: Book,
): [boolean | undefined, number | undefined] {
    const [cached, setCached] = useState<boolean | undefined>(undefined)
    const [progress, setProgress] = useState<number | undefined>(undefined)

    const bookID = book.id
    const pageCount = book.pages.length

    useAsync(
        useCallback(async () => {
            if (await hasPageCache(bookID)) {
                const pageCache = await openPageCache(bookID)
                const pages = (await pageCache?.keys()) ?? []

                setCached(pages.length === pageCount)
                setProgress(pages.length / pageCount)
            } else {
                setCached(false)
                setProgress(undefined)
            }
        }, [bookID, pageCount]),
    )

    const cb = useCallback(
        (event: MessageEvent<Message> | LocalMessageEvent) => {
            const message = event.data
            if (
                message.type !== 'download' ||
                message.model !== 'book' ||
                message.id !== bookID
            ) {
                return
            }
            switch (message.downloadType) {
                case 'progress':
                    setProgress(message.progress)
                    return
                case 'complete':
                    setCached(true)
                    return
                case 'removed':
                    setCached(false)
                    setProgress(undefined)
                    return
            }
        },
        [bookID],
    )
    useEffect(() => {
        cacheEventListener.addEventListener('message', cb)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', cb)
        }
        return (): void => {
            cacheEventListener.removeEventListener('message', cb)
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', cb)
            }
        }
    }, [cb])
    return [cached, progress]
}
