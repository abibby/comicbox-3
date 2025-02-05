import { useEffect, useState } from 'preact/hooks'
import { openToast } from 'src/components/toast'
import { useStateRef } from 'src/hooks/state-ref'
import { Book, Series } from 'src/models'

export function usePromptUpdate<T>(
    liveValues: T[] | null | undefined,
    compare: (a: T, b: T) => boolean,
): T[] | null {
    const [values, setValues] = useState(liveValues)
    const valuesRef = useStateRef(values)
    useEffect(() => {
        let closed = false
        if (!shouldPrompt(valuesRef.current ?? [], liveValues ?? [], compare)) {
            setValues(liveValues)
            return
        }
        openToast('New data', { reload: true }, 0, 'reload-prompt')
            .then(reload => {
                if (closed) {
                    return
                }
                if (reload) {
                    setValues(liveValues)
                }
            })
            .catch(e => openToast(e))

        return () => {
            closed = true
        }
    }, [compare, liveValues, valuesRef])
    return values ?? null
}

function shouldPrompt<T>(
    oldItems: T[],
    liveItems: T[],
    compare: (a: T, b: T) => boolean,
): boolean {
    if (oldItems.length === 0) {
        return false
    }
    for (let i = 0; i < Math.min(oldItems.length, liveItems.length); i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!compare(oldItems[i]!, liveItems[i]!)) {
            return true
        }
    }
    return false
}

export function bookCompare(a: Book, b: Book): boolean {
    return a.id === b.id
}

export function seriesCompare(a: Series, b: Series): boolean {
    return a.slug === b.slug
}
