import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import classNames from '../classnames'
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
    return (
        <div
            class={classNames(styles.book, {
                [styles.placeholder]: props.placeholder,
                [styles.disabled]: props.disabled,
            })}
        >
            <a href={props.link}>
                <img
                    class={styles.cover}
                    src={props.image}
                    alt='cover image'
                    loading='lazy'
                />
                {props.menu && (
                    <button class={styles.menu} onClick={open}>
                        Menu
                    </button>
                )}
                <div class={styles.title}>{props.title}</div>
                <div class={styles.subtitle}>{props.subtitle}</div>
            </a>
        </div>
    )
}
