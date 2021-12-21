import moreVertical from 'asset-url:res/icons/more-vertical.svg'
import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import classNames from 'src/classnames'
import styles from './card.module.css'
import { ContextMenuItems, openContextMenu } from './context-menu'

interface BookProps {
    title: string
    subtitle?: string
    image?: string
    link?: string
    menu?: ContextMenuItems
    placeholder?: boolean
    disabled?: boolean
    progress?: number
}

export const Card: FunctionalComponent<BookProps> = props => {
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

    return (
        <div
            class={classNames(styles.book, {
                [styles.placeholder]: props.placeholder,
                [styles.disabled]: props.disabled,
            })}
        >
            <a href={props.link}>
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
                <div class={styles.title}>{props.title}</div>
                <div class={styles.subtitle}>{props.subtitle}</div>
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
