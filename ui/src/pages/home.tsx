import { Fragment, FunctionalComponent, h } from 'preact'
import { bookAPI, seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'
import { useReading } from 'src/hooks/reading'
import { SeriesOrder } from 'src/models'

export const Home: FunctionalComponent = () => {
    return (
        <Fragment>
            <Reading />
            <Latest />
            <NewSeries />
        </Fragment>
    )
}

export const Reading: FunctionalComponent = () => {
    const books = useReading()

    if (books?.length === 0) {
        return <Fragment></Fragment>
    }

    return <BookList title='Comtinue Reading' books={books} />
}

export const Latest: FunctionalComponent = () => {
    const books = useCached({
        listName: 'latest',
        request: { limit: 15, order_by: 'created_at', order: 'desc' },
        table: DB.books,
        network: bookAPI.list,
    })

    return <BookList title='Latest Books' books={books} />
}

export const NewSeries: FunctionalComponent = () => {
    const series = useCached({
        listName: 'latest',
        request: { limit: 15, order_by: SeriesOrder.CreatedAt, order: 'desc' },
        table: DB.series,
        network: seriesAPI.list,
    })

    return <SeriesList title='Latest Series' series={series} />
}
