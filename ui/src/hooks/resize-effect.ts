import { EffectCallback, Inputs, useLayoutEffect } from "preact/hooks"

export function useResizeEffect(effect: EffectCallback, inputs?: Inputs): void {
    useLayoutEffect(() => {
        let close = effect()
        const onResize = () => {
            close?.()
            close = effect()
        }
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
            close?.()
        }
    }, inputs)
}