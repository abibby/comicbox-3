import { Fragment, FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'
import { BookList } from 'src/components/book-list'
import { SeriesList } from 'src/components/series-list'
import { useBookList } from 'src/hooks/book'
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
    const [series, seriesLoading] = useSeriesList('reading', {
        order_by: SeriesOrder.LastRead,
        with_latest_book: true,
        list: 'reading',
        limit: null,
    })

    const books = useMemo(
        () => series.map(s => s.latest_book).filter(notNullish),
        [series],
    )

    if (!seriesLoading && books?.length === 0) {
        return <Fragment></Fragment>
    }

    return (
        <BookList
            title='Comtinue Reading'
            books={books}
            series={series}
            loading={seriesLoading}
        />
    )
}

export const Latest: FunctionalComponent = () => {
    const [books, loading] = useBookList('latest', {
        limit: 15,
        order_by: 'created_at',
        order: 'desc',
        with_series: true,
    })

    return <BookList title='Latest Books' books={books} loading={loading} />
}

export const NewSeries: FunctionalComponent = () => {
    const [series, loading] = useSeriesList('latest', {
        limit: 15,
        order_by: SeriesOrder.CreatedAt,
        order: 'desc',
    })

    return (
        <SeriesList title='Latest Series' series={series} loading={loading} />
    )
}
