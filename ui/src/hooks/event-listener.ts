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
