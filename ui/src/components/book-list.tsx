import { FunctionalComponent, h } from 'preact'
import { BookCard } from 'src/components/book-card'
import { Card, CardList } from 'src/components/card'
import { Book } from 'src/models'

const scrollOptions: ScrollIntoViewOptions = {
    inline: 'center',
    block: 'center',
}

interface BookListProps {
    title?: string
    books: Book[] | null
    scrollTo?: Book | null
    scroll?: 'auto' | 'horizontal' | 'vertical'
}

export const BookList: FunctionalComponent<BookListProps> = props => {
    return (
        <CardList title={props.title} scroll={props.scroll}>
            {props.books?.map(b => (
                <BookCard
                    key={b.id}
                    book={b}
                    scrollIntoView={
                        b === props.scrollTo ? scrollOptions : false
                    }
                />
            )) ?? <Card title='title' subtitle='subtitle' placeholder />}
        </CardList>
    )
}
