import { useEffect, useRef, useState } from 'preact/hooks'
import { openToast } from 'src/components/toast'
import { useStateRef } from 'src/hooks/state-ref'
import { Book, Series } from 'src/models'
import { useEventListener } from 'src/hooks/event-listener'
import { cacheEventTarget, UpdateEvent } from 'src/cache'
import { useLocation } from 'preact-iso'

const triggerUpdates = new EventTarget()

export function usePromptUpdate<T, K>(
    liveValues: T[] | null | undefined,
    getKey: (a: T) => K,
): T[] | null {
    const [values, setValues] = useState(liveValues)
    const liveValuesRef = useStateRef(liveValues)
    const valuesRef = useStateRef(values)
    const lastInteraction = useRef(0)
    const location = useLocation()

    useEffect(() => {
        lastInteraction.current = Date.now()
    }, [location.url])

    useEventListener(
        triggerUpdates,
        'update',
        () => {
            setValues(liveValuesRef.current)
        },
        [],
    )
    useEventListener(
        cacheEventTarget,
        'update',
        (e: UpdateEvent) => {
            if (e.fromUserInteraction) {
                lastInteraction.current = Date.now()
            }
        },
        [],
    )

    useEffect(() => {
        if (
            !shouldPrompt(
                lastInteraction.current,
                valuesRef.current ?? [],
                liveValues ?? [],
                getKey,
            )
        ) {
            setValues(liveValues)
            return
        }
        openToast('New data', { reload: true }, 0, 'reload-prompt')
            .then(reload => {
                if (reload) {
                    triggerUpdates.dispatchEvent(new Event('update'))
                }
            })
            .catch(e => openToast(e))
    }, [getKey, liveValues, valuesRef])

    useEffect(() => {
        if (!liveValues) return
        const valueMap = new Map(liveValues?.map(val => [getKey(val), val]))
        setValues(oldValues =>
            oldValues?.map(
                oldValue => valueMap.get(getKey(oldValue)) ?? oldValue,
            ),
        )
    }, [getKey, liveValues])
    return values ?? null
}

function shouldPrompt<T, K>(
    lastInteraction: number,
    oldItems: T[],
    liveItems: T[],
    getKey: (a: T) => K,
): boolean {
    if (Date.now() - lastInteraction < 200) {
        return false
    }
    if (oldItems.length === 0) {
        return false
    }
    for (let i = 0; i < Math.min(oldItems.length, liveItems.length); i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (getKey(oldItems[i]!) !== getKey(liveItems[i]!)) {
            return true
        }
    }
    return false
}

export function bookCompare(b: Book): string {
    return b.id
}

export function seriesCompare(s: Series): string {
    return s.slug
}
