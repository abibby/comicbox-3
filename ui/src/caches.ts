import EventTarget, { Event } from 'event-target-shim'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { useAsync } from 'src/hooks/async'
import { Message } from 'src/message'
import { Book } from 'src/models'

const STATIC_CACHE_NAME = 'static-cache-v1'
const THUMB_CACHE_NAME = 'image-cache-v1'
const PAGE_CACHE_PREFIX = 'page-cache-v1-'

class LocalMessageEvent extends Event<'message'> {
    constructor(public readonly data: Message) {
        super('message')
    }
}
type EventMap = {
    message: LocalMessageEvent
}
const t = new EventTarget<EventMap, 'strict'>()

export function openStaticCache(): Promise<Cache> {
    return caches.open(STATIC_CACHE_NAME)
}

export function openThumbCache(): Promise<Cache> {
    return caches.open(THUMB_CACHE_NAME)
}

export function openPageCache(bookID: string): Promise<Cache> {
    return caches.open(PAGE_CACHE_PREFIX + bookID)
}

export function hasBookCache(bookID: string): Promise<boolean> {
    return caches.has(PAGE_CACHE_PREFIX + bookID)
}

export async function removeBookCache(bookID: string): Promise<void> {
    await caches.delete(PAGE_CACHE_PREFIX + bookID)
    const message: Message = {
        type: 'download',
        downloadType: 'removed',
        id: bookID,
        model: 'book',
    }
    t.dispatchEvent(new LocalMessageEvent(message))
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
            if (await hasBookCache(bookID)) {
                const pageCache = await openPageCache(bookID)
                const pages = await pageCache.keys()

                setCached(pages.length === pageCount)
                setProgress(pages.length / pageCount)
            } else {
                setCached(false)
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
        t.addEventListener('message', cb)
        navigator.serviceWorker.addEventListener('message', cb)
        return (): void => {
            t.removeEventListener('message', cb)
            navigator.serviceWorker.removeEventListener('message', cb)
        }
    }, [cb])
    return [cached, progress]
}
