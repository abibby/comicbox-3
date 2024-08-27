import {
    Fragment,
    FunctionalComponent,
    h,
    JSX,
    ComponentChildren,
} from 'preact'
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/card.module.css'
import { ContextMenuItems, openContextMenu } from 'src/components/context-menu'
import { LazyImg } from 'src/components/lazy-img'
import {
    ChevronRight,
    ChevronLeft,
    MoreVertical,
    CheckCircle,
} from 'preact-feather'
import { Link } from 'preact-router'

interface CardProps {
    title: string
    subtitle?: string
    image?: string
    link?: string | (() => void)
    menu?: ContextMenuItems
    placeholder?: boolean
    disabled?: boolean
    progress?: number
    downloaded?: boolean
    downloadProgress?: number
    scrollIntoView?: boolean | ScrollIntoViewOptions
}

export const Card: FunctionalComponent<CardProps> = props => {
    const card = useRef<HTMLDivElement | null>(null)
    const open = useCallback(
        async (e: JSX.TargetedMouseEvent<HTMLElement>) => {
            e.preventDefault()
            e.stopPropagation()
            if (props.menu !== undefined) {
                await openContextMenu(e.target, props.menu)
            }
        },
        [props.menu],
    )

    let alt = props.title
    if (props.subtitle !== undefined) {
        alt += ' ' + props.subtitle
    }

    let href: string | undefined
    let click: (() => void) | undefined

    if (typeof props.link === 'function') {
        click = props.link
    } else {
        href = props.link
    }

    useLayoutEffect(() => {
        if (props.scrollIntoView) {
            card.current?.scrollIntoView(props.scrollIntoView)
        }
    }, [props.scrollIntoView])

    return (
        <div
            ref={card}
            class={classNames(styles.book, {
                [styles.placeholder]: props.placeholder,
                [styles.disabled]: props.disabled,
            })}
        >
            <a href={props.disabled ? undefined : href} onClick={click}>
                <Progress progress={props.progress ?? 0} />
                <LazyImg class={styles.cover} src={props.image} alt={alt} />
                <Download
                    progress={props.downloadProgress}
                    completed={props.downloaded}
                />
                {props.menu && (
                    <button class={styles.menu} onClick={open}>
                        <MoreVertical />
                    </button>
                )}
                <div class={styles.title} title={props.title}>
                    {props.title}
                </div>
                <div class={styles.subtitle} title={props.subtitle}>
                    {props.subtitle}
                </div>
            </a>
        </div>
    )
}

interface ProgressProps {
    progress: number
}

const Progress: FunctionalComponent<ProgressProps> = ({ progress }) => {
    return (
        <div
            class={styles.progress}
            style={{ '--progress': clamp(progress, 0, 1) }}
        />
    )
}

interface DownloadProps {
    progress: number | undefined
    completed: boolean | undefined
}
const Download: FunctionalComponent<DownloadProps> = ({
    progress,
    completed,
}) => {
    if (
        progress === undefined &&
        (completed === undefined || completed === false)
    ) {
        return <Fragment />
    }
    let downloadProgress = 0
    if (progress) {
        downloadProgress = clamp(progress ?? 0, 0, 1)
    }
    if (completed) {
        downloadProgress = 1.1
    }

    return (
        <CheckCircle
            style={{
                '--download-progress': downloadProgress,
            }}
            class={styles.downloaded}
            alt='downloaded'
        />
    )
}

function clamp(value: number, min: number, max: number): number {
    if (value > max) {
        return max
    }
    if (value < min) {
        return min
    }
    return value
}

export interface CardListProps {
    title?: string
    link?: string
    scroll?: 'auto' | 'horizontal' | 'vertical'
    class?: string
    children: ComponentChildren
}

export const CardList: FunctionalComponent<CardListProps> = ({
    title,
    link,
    scroll = 'auto',
    children,
    class: className,
}) => {
    const scroller = useRef<HTMLDivElement | null>(null)
    const [atStart, setAtStart] = useState(true)
    const [atEnd, setAtEnd] = useState(false)

    const onScroll = useCallback(() => {
        if (scroller.current === null) {
            return
        }
        const rect = scroller.current.getBoundingClientRect()
        if (scroller.current.scrollWidth === rect.width) {
            setAtStart(true)
            setAtEnd(true)
            return
        }
        setAtStart(scroller.current.scrollLeft <= 0)
        setAtEnd(
            scroller.current.scrollLeft >=
                Math.floor(scroller.current.scrollWidth) -
                    Math.ceil(rect.width),
        )
    }, [])

    const scrollPercent = useCallback((percent: number) => {
        if (scroller.current === null) {
            return
        }
        const rect = scroller.current.getBoundingClientRect()
        scroller.current.scrollBy({
            left: rect.width * percent,
            behavior: 'smooth',
        })
    }, [])
    const next = useCallback(() => {
        scrollPercent(0.75)
    }, [scrollPercent])
    const previous = useCallback(() => {
        scrollPercent(-0.75)
    }, [scrollPercent])
    useEffect(() => {
        if (scroller.current === null) {
            return
        }

        const observer = new MutationObserver(() => {
            onScroll()
        })
        onScroll()
        observer.observe(scroller.current, { childList: true })
        return () => {
            observer.disconnect()
        }
    }, [onScroll])

    return (
        <div
            class={classNames(styles.cardList, className, {
                [styles.start]: atStart,
                [styles.end]: atEnd,
                [styles.horizontal]: scroll === 'horizontal',
                [styles.vertical]: scroll === 'vertical',
            })}
        >
            <div class={styles.header}>
                <h3 class={styles.title}>
                    {link ? (
                        <Link href={link}>
                            {title}{' '}
                            <ChevronRight
                                class={styles.titleLinkIcon}
                                width='1em'
                                height='1em'
                            />
                        </Link>
                    ) : (
                        title
                    )}
                </h3>
                <button class={styles.previous} onClick={previous}>
                    <ChevronLeft />
                </button>
                <button class={styles.next} onClick={next}>
                    <ChevronRight />
                </button>
            </div>
            <div class={styles.scroller} ref={scroller} onScroll={onScroll}>
                {children}
            </div>
        </div>
    )
}
