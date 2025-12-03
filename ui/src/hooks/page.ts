import { useEffect, useState } from 'preact/hooks'
import { pageURL } from 'src/api'
import { PageURLOptions } from 'src/api/internal'
import { Book, Page, Series } from 'src/models'

export function usePageURL(
    model: Book | Series | Page | null,
    page?: number,
    options?: PageURLOptions,
): string | undefined {
    const [url, setURL] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (!model) {
            setURL(undefined)
            return
        }
        void pageURL(model, page, options).then(pURL => setURL(pURL))
    }, [model, page, JSON.stringify(options)])
    return url
}
