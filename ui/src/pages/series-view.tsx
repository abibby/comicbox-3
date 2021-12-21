import { FunctionalComponent, h } from 'preact'
import { useCallback } from 'preact/hooks'
import { openModal } from 'src/components/modal'
import { EditSeries } from 'src/components/series-edit'
import { post } from 'src/message'
import { Series } from 'src/models'
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
    )

    if (seriesList === null) {
        return <SeriesList name={name} />
    }

    const s = seriesList[0]
    if (s === undefined) {
        return <Error404 />
    }

    return <SeriesList name={name} series={s} />
}

interface SeriesListProps {
    name: string
    series?: Series
}

const SeriesList: FunctionalComponent<SeriesListProps> = ({ name, series }) => {
    const listName = `series:${name}`

    const books = useCached(listName, { series: name }, DB.books, book.list)

    const editSeries = useCallback(() => {
        if (series === undefined) {
            return
        }
        openModal(EditSeries, {
            series: series,
        })
    }, [series])

    const downloadSeries = useCallback(() => {
        post({
            type: 'download-series',
            seriesName: name,
        })
    }, [name])

    return (
        <div>
            <h1>{name}</h1>
            <div>
                <button onClick={downloadSeries}>download</button>
                <button onClick={editSeries}>edit</button>
            </div>
            <BookList books={books} />
        </div>
    )
}
