import { FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'
import { usePromptUpdate } from 'src/cache'
import { BookCard } from 'src/components/book-card'
import { Card, CardList } from 'src/components/card'
import { Book, Series } from 'src/models'

const scrollOptions: ScrollIntoViewOptions = {
    inline: 'center',
    block: 'center',
}

interface BookListProps {
    title?: string
    books: Book[] | null
    series?: Series[] | null
    scrollTo?: Book | null
    scroll?: 'auto' | 'horizontal' | 'vertical'
    loading?: boolean
}

export const BookList: FunctionalComponent<BookListProps> = props => {
    const seriesMap = useMemo(
        () => new Map((props.series ?? []).map(s => [s.slug, s])),
        [props.series],
    )

    const books = usePromptUpdate('New books', props.books)

    if (books === null || props.series === null || props.loading) {
        return (
            <CardList title={props.title} scroll={props.scroll}>
                <Card title='title' subtitle='subtitle' placeholder />
                <Card title='title' subtitle='subtitle' placeholder />
                <Card title='title' subtitle='subtitle' placeholder />
            </CardList>
        )
    }
    return (
        <CardList title={props.title} scroll={props.scroll}>
            {books.map(b => (
                <BookCard
                    key={b.id}
                    book={b}
                    series={seriesMap.get(b.series_slug)}
                    scrollIntoView={
                        b === props.scrollTo ? scrollOptions : false
                    }
                />
            ))}
        </CardList>
    )
}
