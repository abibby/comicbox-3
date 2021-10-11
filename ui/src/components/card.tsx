import { FunctionalComponent, h } from 'preact';
import styles from './card.module.css';

interface BookProps {
    title: string
    subtitle?: string
    image: string
    link: string
}

export const Card: FunctionalComponent<BookProps> = props => {
        return <div class={styles.book}>
        <a href={props.link} >
            <img class={styles.cover} src={props.image} alt="cover image" loading="lazy" />
            <div class={styles.title}>{props.title}</div>
            <div class={styles.series}>{props.subtitle}</div>
        </a>
    </div>
}
