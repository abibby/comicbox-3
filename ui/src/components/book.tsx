import noImage from 'asset-url:../../res/images/no-cover.svg';
import { FunctionalComponent, h } from 'preact';
import { Book } from '../models';
import styles from './book.module.css';

interface BookProps {
    book: Book
}

export const BookCard: FunctionalComponent<BookProps> = props => {
    let title = ""
    if (props.book.volume) { 
        title += "V" + props.book.volume
    }
    if (props.book.chapter) { 
        if (title !== "") {
            title += " "
        }
        title += "#" + props.book.chapter
    }
    if (props.book.title) {
        if (title !== "") {
            title += " • "
        }
        title += props.book.title
    }
    return <div class={styles.book}>
        <a href={`/book/${props.book.id}`} >
            <img class={styles.cover} src={bookCover(props.book)} alt="cover image" />
            <div class={styles.title}>{title}</div>
            <div class={styles.series}>{props.book.series}</div>
        </a>
    </div>
}

function bookCover(book: Book): string {    
    if (book.pages[0] !== undefined){
        return book.pages[0].url
    }
    return noImage
}
