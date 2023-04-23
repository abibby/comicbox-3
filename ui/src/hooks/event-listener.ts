import EventTargetShim, { Event as EventShim } from 'event-target-shim'
import { Inputs, useCallback, useEffect } from 'preact/hooks'

export function useEventListener<
    TEventMap extends Record<string, EventShim | Event>,
    TMode extends 'standard' | 'strict',
    TType extends string & keyof TEventMap,
>(
    target: TEventMap extends Record<string, EventShim>
        ? EventTargetShim<TEventMap, TMode>
        : EventTarget,
    type: TType,
    callback: (e: TEventMap[TType]) => void,
    inputs: Inputs,
): void {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cb = useCallback(callback, inputs)

    useEffect(() => {
        target.addEventListener(type, callback as never)
        return () => {
            target.removeEventListener(type, callback as never)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cb, target, type])
}

export function useWindowEvent<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => void,
    inputs: Inputs,
): void {
    useEffect(() => {
        window.addEventListener(type, listener)
        return () => {
            window.removeEventListener(type, listener)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listener, type, ...inputs])
}
