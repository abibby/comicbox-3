import { effect, signal, Signal } from '@preact/signals-core'
import { createStore, get, set } from 'idb-keyval'
import { useEffect, useState } from 'preact/hooks'

const store = createStore('persistent-state', 'persistent-state')

export function persistentSignal<T>(id: string, value: T): Signal<T> {
    const s = signal(value)
    let last = value
    void get(id, store).then(v => {
        last = v
        s.value = v
    })

    s.subscribe(value => {
        if (value != last) {
            last = value
            void set(id, value, store)
        }
    })
    return s
}

export function useSignal<T>(state: Signal<T>): T {
    const [value, setValue] = useState(state.value)
    useEffect(() => {
        return state.subscribe(v => setValue(v))
    }, [state])

    return value
}
