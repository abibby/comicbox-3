import { useEffect, useState } from 'preact/hooks'
import { pageURL } from '../api'
import { Book, Page, Series } from '../models'

export function usePageURL(
    model: Book | Series | Page,
    page?: number,
    thumbnail = false,
): string | undefined {
    const [url, setURL] = useState<string | undefined>(undefined)
    useEffect(() => {
        pageURL(model, page, thumbnail).then(pURL => setURL(pURL))
    }, [model, page, thumbnail])
    return url
}
