import {
    Fragment,
    FunctionalComponent,
    h,
    JSX,
    ComponentChildren,
} from 'preact'
import {
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'preact/hooks'
import classNames from 'src/classnames'
import styles from 'src/components/card.module.css'
import { ContextMenuItem, openContextMenu } from 'src/components/context-menu'
import { LazyImg } from 'src/components/lazy-img'
import {
    ChevronRight,
    ChevronLeft,
    MoreVertical,
    CheckCircle,
    Check,
} from 'preact-feather'
import { useResizeEffect } from 'src/hooks/resize-effect'

interface CardProps {
    title: string
    subtitle?: string
    image?: string
    link?: string | (() => void)
    menu?: ContextMenuItem[]
    placeholder?: boolean
    disabled?: boolean
    progress?: number
    downloaded?: boolean
    downloadProgress?: number
    scrollIntoView?: boolean | ScrollIntoViewOptions
    testID?: string
}

export const Card: FunctionalComponent<CardProps> = props => {
    const card = useRef<HTMLDivElement | null>(null)
    const open = useCallback(
        async (e: JSX.TargetedMouseEvent<HTMLElement>) => {
            e.preventDefault()
            e.stopPropagation()
            if (props.menu !== undefined) {
                await openContextMenu(e, props.menu)
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

    const showMenu = useMemo(() => {
        return (
            (props.menu?.filter(item => item.active !== false).length ?? 0) > 0
        )
    }, [props.menu])

    const progress = props.progress ?? 0

    return (
        <div
            data-testid={props.testID}
            ref={card}
            class={classNames(styles.card, {
                [styles.placeholder]: props.placeholder,
                [styles.disabled]: props.disabled,
            })}
        >
            <a href={props.disabled ? undefined : href} onClick={click}>
                <div class={styles.cover}>
                    <Download
                        progress={props.downloadProgress}
                        completed={props.downloaded}
                    />
                    {progress > 0 && progress < 1 && (
                        <Progress progress={progress} />
                    )}
                    {progress >= 1 && <Check class={styles.done} />}
                    <LazyImg src={props.image} alt={alt} />
                </div>
                {showMenu && (
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

    useResizeEffect(() => {
        onScroll()
    }, [children, onScroll])

    return (
        <section
            class={classNames(styles.cardList, className, {
                [styles.start]: atStart,
                [styles.end]: atEnd,
                [styles.horizontal]: scroll === 'horizontal',
                [styles.vertical]: scroll === 'vertical',
            })}
        >
            <div class={styles.header}>
                <h3 class={styles.listTitle}>
                    {link ? (
                        <a href={link}>
                            {title}{' '}
                            <ChevronRight
                                class={styles.titleLinkIcon}
                                width='1em'
                                height='1em'
                            />
                        </a>
                    ) : (
                        title
                    )}
                </h3>
                <button
                    class={styles.previous}
                    onClick={previous}
                    tabIndex={-1}
                >
                    <ChevronLeft />
                </button>
                <button class={styles.next} onClick={next} tabIndex={-1}>
                    <ChevronRight />
                </button>
            </div>
            <div class={styles.scroller} ref={scroller} onScroll={onScroll}>
                {children}
            </div>
        </section>
    )
}
