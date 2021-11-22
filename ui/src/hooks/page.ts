import { useEffect, useState } from 'preact/hooks'
import { pageURL } from '../api'
import { Book, Page, Series } from '../models'

export function usePageURL(
    model: Book | Series | Page,
    page?: number,
): string | undefined {
    const [url, setURL] = useState<string | undefined>(undefined)
    useEffect(() => {
        pageURL(model, page).then(pURL => setURL(pURL))
    }, [model, page])
    return url
}
