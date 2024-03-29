import { useEffect, useState } from 'preact/hooks'
import { pageURL } from 'src/api'
import { Book, Page, Series } from 'src/models'

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
