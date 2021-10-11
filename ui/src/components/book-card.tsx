import { FunctionalComponent, h } from 'preact';
import { Book } from '../models';
import { Card } from './card';

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
    return <Card
        image={props.book.cover_url}
        link={`/book/${props.book.id}`}
        title={props.book.series}
        subtitle={title}
     />
}
