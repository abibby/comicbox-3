import noImage from 'asset-url:../../res/images/no-cover.svg';
import { FunctionalComponent, h } from 'preact';
import { Book } from '../models';
import styles from './book.module.css';

interface BookProps {
    book: Book
}

export const BookCard: FunctionalComponent<BookProps> = props => {
    return <div class={styles.book}>
        <a href={`/book/${props.book.id}`} >
            <img class={styles.cover} src={noImage} alt="cover image" />
            <div class={styles.title}>{props.book.title}</div>
            <div class={styles.series}>{props.book.series}</div>
        </a>
    </div>
}
