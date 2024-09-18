import { useEffect, useState } from 'preact/hooks'
import { pageURL } from 'src/api'
import { Book, Page, Series } from 'src/models'

export function usePageURL(
    model: Book | Series | Page,
    page?: number,
    { thumbnail = false, encode = false } = {},
): string | undefined {
    const [url, setURL] = useState<string | undefined>(undefined)
    useEffect(() => {
        void pageURL(model, page, { thumbnail, encode }).then(pURL =>
            setURL(pURL),
        )
    }, [model, page, thumbnail, encode])
    return url
}
