import { Fragment, FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'
import { bookAPI, seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'
import { useSeriesList } from 'src/hooks/series'
import { SeriesOrder } from 'src/models'
import { notNullish } from 'src/util'

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
    const [series] = useSeriesList('reading', {
        order_by: SeriesOrder.LastRead,
        with_latest_book: true,
        list: 'reading',
    })

    const books = useMemo(
        () => series?.map(s => s.latest_book).filter(notNullish) ?? null,
        [series],
    )

    if (books?.length === 0) {
        return <Fragment></Fragment>
    }

    return <BookList title='Comtinue Reading' books={books} series={series} />
}

export const Latest: FunctionalComponent = () => {
    const books = useCached({
        listName: 'latest',
        request: {
            limit: 15,
            order_by: 'created_at',
            order: 'desc',
            with_series: true,
        },
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
