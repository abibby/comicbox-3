import { useEffect, useRef, useState } from 'preact/hooks'
import { openToast } from 'src/components/toast'
import { useStateRef } from 'src/hooks/state-ref'
import { Book, Series } from 'src/models'
import { useEventListener } from 'src/hooks/event-listener'
import { cacheEventTarget, UpdateEvent } from 'src/cache'

const triggerUpdates = new EventTarget()

export function usePromptUpdate<T>(
    liveValues: T[] | null | undefined,
    compare: (a: T, b: T) => boolean,
): T[] | null {
    const [values, setValues] = useState(liveValues)
    const liveValuesRef = useStateRef(liveValues)
    const valuesRef = useStateRef(values)
    const lastInteraction = useRef(0)

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
        let closed = false
        if (
            !shouldPrompt(
                lastInteraction.current,
                valuesRef.current ?? [],
                liveValues ?? [],
                compare,
            )
        ) {
            setValues(liveValues)
            return
        }
        openToast('New data', { reload: true }, 0, 'reload-prompt')
            .then(reload => {
                if (closed) {
                    return
                }
                if (reload) {
                    triggerUpdates.dispatchEvent(new Event('update'))
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
    lastInteraction: number,
    oldItems: T[],
    liveItems: T[],
    compare: (a: T, b: T) => boolean,
): boolean {
    if (Date.now() - lastInteraction < 200) {
        return false
    }
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
