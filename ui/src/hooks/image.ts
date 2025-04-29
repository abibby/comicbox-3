import { getAuthImageToken } from 'src/api/internal'
import { useAsyncCallback } from 'src/hooks/async'

export async function imageURL(url: string): Promise<string> {
    const u = new URL(url)
    const token = await getAuthImageToken()
    if (token !== null) {
        u.searchParams.set('_token', token)
    }

    return u.toString()
}

export function useImageURL(url: string | undefined): string | undefined {
    const result = useAsyncCallback(async () => {
        if (!url) {
            return undefined
        }
        return imageURL(url)
    }, [url])
    return result.data
}
