import { FunctionalComponent, h } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import classNames from 'src/classnames'
import { BlurHash } from 'src/components/blur-hash'
import styles from 'src/components/lazy-img.module.css'

interface LazyImgProps {
    blurHash?: string
    src?: string
    class?: string
    alt?: string
}

export const LazyImg: FunctionalComponent<LazyImgProps> = props => {
    const image = useRef<HTMLImageElement | null>(null)
    const [visible, setVisible] = useState(false)
    const [showBlurHash, setShowBlurHash] = useState(false)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        const imageElement = image.current
        if (imageElement !== null) {
            const lazyImageObserver = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setVisible(true)
                        setShowBlurHash(true)
                    }
                }
            })

            lazyImageObserver.observe(imageElement)

            return () => {
                lazyImageObserver.unobserve(imageElement)
            }
        }
    }, [image, props.src])

    const imageLoad = useCallback(() => {
        setLoaded(true)
        setTimeout(() => {
            setShowBlurHash(false)
        }, 500)
    }, [])

    return (
        <div ref={image} class={classNames(props.class, styles.lazyImg)}>
            {showBlurHash && props.blurHash && (
                <BlurHash class={styles.blurHash} blurHash={props.blurHash} />
            )}
            <img
                src={visible ? props.src : undefined}
                alt={props.alt}
                class={classNames(styles.image, {
                    [styles.loaded]: !props.blurHash || loaded,
                })}
                onLoad={imageLoad}
            />
        </div>
    )
}
