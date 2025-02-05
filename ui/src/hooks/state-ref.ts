import { MutableRef, useEffect, useRef } from 'preact/hooks'

export function useStateRef<T>(value: T): MutableRef<T> {
    const ref = useRef(value)
    useEffect(() => {
        ref.current = value
    }, [value])
    return ref
}
