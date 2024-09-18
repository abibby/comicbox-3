import { createStore, get, set } from 'idb-keyval'
import { useEffect, useState } from 'preact/hooks'

const store = createStore('persistent-state', 'persistent-state')

export interface State<T> extends EventTarget {
    value: T
}

export class PersistentState<T> extends EventTarget implements State<T> {
    public get value(): T {
        return this._value
    }
    public set value(v: T) {
        this._value = v
        this.dispatchEvent(new Event('change'))
        void set(this.id, v, store)
    }

    public constructor(private id: string, private _value: T) {
        super()
        void get(id, store).then(v => {
            this._value = v
            this.dispatchEvent(new Event('change'))
        })
    }
}

export function useValue<T>(state: State<T>): T {
    const [value, setValue] = useState(state.value)
    useEffect(() => {
        const change = () => {
            setValue(state.value)
        }
        state.addEventListener('change', change)
        return () => {
            state.removeEventListener('change', change)
        }
    }, [state])

    return value
}
