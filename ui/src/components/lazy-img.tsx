import { FunctionalComponent, h, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

export const LazyImg: FunctionalComponent<JSX.ImgHTMLAttributes> = props => {
    const image = useRef<HTMLImageElement | null>(null)
    const [src, setSrc] = useState<string>()
    const ogSrc = props.src

    useEffect(() => {
        const imageElement = image.current
        if (imageElement !== null) {
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

            lazyImageObserver.observe(imageElement)

            return () => {
                lazyImageObserver.unobserve(imageElement)
            }
        }
    }, [image, ogSrc])

    return <img {...props} src={src} ref={image} />
}
