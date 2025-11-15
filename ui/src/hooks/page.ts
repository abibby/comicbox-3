import { useEffect, useState } from 'preact/hooks'
import { pageURL } from 'src/api'
import { Book, Page, Series } from 'src/models'

export function usePageURL(
    model: Book | Series | Page | null,
    page?: number,
    { thumbnail = false, encode = false } = {},
): string | undefined {
    const [url, setURL] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (!model) {
            setURL(undefined)
            return
        }
        void pageURL(model, page, { thumbnail, encode }).then(pURL =>
            setURL(pURL),
        )
    }, [model, page, thumbnail, encode])
    return url
}
