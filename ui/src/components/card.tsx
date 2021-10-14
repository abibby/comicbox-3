import { FunctionalComponent, h } from 'preact';
import styles from './card.module.css';
import { ContextMenu, ContextMenuItems } from './context-menu';

interface BookProps {
    title: string
    subtitle?: string
    image: string
    link: string
    menu: ContextMenuItems
}

export const Card: FunctionalComponent<BookProps> = props => {
        return <div class={styles.book}>
        <a href={props.link} >
            <img class={styles.cover} src={props.image} alt="cover image" loading="lazy" />
            <ContextMenu items={props.menu} />
            <div class={styles.title}>{props.title}</div>
            <div class={styles.series}>{props.subtitle}</div>
        </a>
    </div>
}
