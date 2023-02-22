import { FunctionalComponent, h, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

h

export const LazyImg: FunctionalComponent<
    JSX.HTMLAttributes<HTMLImageElement>
> = props => {
    const image = useRef<HTMLImageElement | null>(null)
    const [src, setSrc] = useState<string>()
    const ogSrc = props.src

    useEffect(() => {
        if (image.current !== null) {
            const lazyImageObserver = new IntersectionObserver(function (
                entries,
            ) {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        if (ogSrc === undefined) {
                            setSrc(undefined)
                        } else {
                            setSrc(String(ogSrc))
                        }
                    }
                }
            })

            lazyImageObserver.observe(image.current)
        }
    }, [image, ogSrc])

    return <img {...props} src={src} ref={image} />
}
