import { useCallback, useEffect, useState } from 'preact/hooks'
import { useAsync } from 'src/hooks/async'
import { Message } from 'src/message'

const STATIC_CACHE_NAME = 'static-cache-v1'
const THUMB_CACHE_NAME = 'image-cache-v1'
const PAGE_CACHE_PREFIX = 'page-cache-v1-'

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

export function useBookCached(bookID: string): [boolean, number] {
    const [cached, setCached] = useState(false)
    const [progress, setProgress] = useState(0)

    useAsync(
        useCallback(async () => {
            const isCached = await hasBookCache(bookID)
            setCached(isCached)
            if (isCached) {
                setProgress(1)
            }
        }, [bookID]),
    )

    const cb = useCallback(
        (event: MessageEvent) => {
            const message: Message = event.data
            if (
                (message.type !== 'download-progress' &&
                    message.type !== 'download-complete') ||
                message.model !== 'book' ||
                message.id !== bookID
            ) {
                return
            }
            switch (message.type) {
                case 'download-progress':
                    setProgress(message.progress)
                    return
                case 'download-complete':
                    setCached(true)
                    return
            }
        },
        [bookID],
    )
    useEffect(() => {
        navigator.serviceWorker.addEventListener('message', cb)
        return (): void => {
            navigator.serviceWorker.removeEventListener('message', cb)
        }
    }, [cb])
    return [cached, progress]
}
