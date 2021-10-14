import { FunctionalComponent, h } from 'preact';
import { useCallback } from 'preact/hooks';
import styles from './card.module.css';
import { ContextMenuItems, openContextMenu } from './context-menu';

interface BookProps {
    title: string
    subtitle?: string
    image: string
    link: string
    menu: ContextMenuItems
}

export const Card: FunctionalComponent<BookProps> = props => {
    const open = useCallback((e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        openContextMenu(e.target, props.menu)
    }, [])
    return <div class={styles.book}>
        <a href={props.link} >
            <img class={styles.cover} src={props.image} alt="cover image" loading="lazy" />
            <button class={styles.menu} onClick={open}>Menu</button>
            <div class={styles.title}>{props.title}</div>
            <div class={styles.series}>{props.subtitle}</div>
        </a>
    </div>
}
