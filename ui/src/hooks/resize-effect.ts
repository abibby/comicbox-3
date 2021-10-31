import { EffectCallback, Inputs, useLayoutEffect } from 'preact/hooks'

export function useResizeEffect(
    effect: EffectCallback,
    inputs: Inputs = [],
): void {
    useLayoutEffect(() => {
        let close = effect()
        const onResize = () => {
            if (typeof close === 'function') {
                close()
            }
            close = effect()
        }
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
            if (typeof close === 'function') {
                close()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, inputs)
}
