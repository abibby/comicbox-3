import EventTarget, { Event } from 'event-target-shim'
import { Inputs, useEffect } from 'preact/hooks'

export function useEventListener<
    TEventMap extends Record<string, Event>,
    TMode extends 'standard' | 'strict',
    TType extends string & keyof TEventMap,
>(
    target: EventTarget<TEventMap, TMode>,
    type: TType,
    callback: (e: TEventMap[TType]) => void,
    inputs: Inputs,
): void {
    useEffect(() => {
        target.addEventListener(type, callback)
        return () => {
            target.removeEventListener(type, callback)
        }
    }, inputs)
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
    }, inputs)
}
