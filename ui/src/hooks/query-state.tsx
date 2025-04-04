import { useCallback, useEffect, useState } from 'preact/hooks'

export function useQueryState(
    key: string,
    initialState: string,
): [string, (t: string | number) => void] {
    const [value, setValue] = useState(initialState)

    const fullSetValue = useCallback(
        (v: string | number) => {
            const strV = String(v)
            const u = new URL(location.href)
            if (strV === '') {
                u.searchParams.delete(key)
            } else {
                u.searchParams.set(key, strV)
            }
            setValue(strV)
            history.replaceState({}, '', u.toString())
        },
        [key],
    )

    useEffect(() => {
        const u = new URL(location.href)
        setValue(u.searchParams.get(key) ?? initialState)
    }, [key, initialState])

    return [value, fullSetValue]
}
