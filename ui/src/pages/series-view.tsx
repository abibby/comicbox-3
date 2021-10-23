import { FunctionalComponent, h } from 'preact'
import { book, series } from '../api'
import { useCached } from '../cache'
import { BookList } from '../components/book-list'
import { DB } from '../database'
import { Error404 } from './404'

interface SeriesViewProps {
    matches?: {
        series: string
    }
}

export const SeriesView: FunctionalComponent<SeriesViewProps> = props => {
    const name = props.matches?.series ?? ''
    const listName = `series:${name}`
    const seriesList = useCached(
        listName,
        { name: name },
        DB.series,
        series.list,
        series.cachedList,
    )
    if (seriesList === null) {
        return (
            <div>
                <h1>loading</h1>
                <BookList books={null} />
            </div>
        )
    }
    const s = seriesList[0]
    if (s === undefined) {
        return <Error404 />
    }

    const books = useCached(
        listName,
        { series: s.name },
        DB.books,
        book.list,
        book.cachedList,
    )
    return (
        <div>
            <h1>{s.name}</h1>
            <BookList books={books} />
        </div>
    )
}
