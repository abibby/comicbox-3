import moreVertical from 'asset-url:res/icons/more-vertical.svg'
import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from './card.module.css'
import { ContextMenuItems, openContextMenu } from './context-menu'

interface CardProps {
    title: string
    subtitle?: string
    image?: string
    link?: string | (() => void)
    menu?: ContextMenuItems
    placeholder?: boolean
    disabled?: boolean
    progress?: number
}

export const Card: FunctionalComponent<CardProps> = props => {
    const open = useCallback(
        (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            if (props.menu !== undefined) {
                openContextMenu(e.target, props.menu)
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

    return (
        <div
            class={classNames(styles.book, {
                [styles.placeholder]: props.placeholder,
                [styles.disabled]: props.disabled,
            })}
        >
            <a href={href} onClick={click}>
                <Progress progress={props.progress ?? 0} />
                <img
                    class={styles.cover}
                    src={props.image}
                    alt={alt}
                    loading='lazy'
                />
                {props.menu && (
                    <button class={styles.menu} onClick={open}>
                        <img src={moreVertical} alt='menu' />
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

function clamp(value: number, min: number, max: number): number {
    if (value > max) {
        return max
    }
    if (value < min) {
        return min
    }
    return value
}
