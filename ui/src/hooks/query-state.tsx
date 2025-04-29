import { useRoute, useLocation } from 'preact-iso'
import { useCallback } from 'preact/hooks'

export function useQueryState(
    key: string,
    initialState: string,
): [string, (t: string | number) => void] {
    const route = useRoute()
    const loc = useLocation()

    const setValue = useCallback(
        (v: string | number) => {
            const newQuery: Record<string, string> = {
                ...route.query,
            }
            if (v !== '') {
                newQuery[key] = String(v)
            } else {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete newQuery[key]
            }
            const query = new URLSearchParams(newQuery)

            loc.route(route.path + '?' + query.toString())
        },
        [key, loc, route.path, route.query],
    )

    return [route.query[key] ?? initialState, setValue]
}
