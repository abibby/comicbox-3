import { FunctionalComponent, h } from 'preact'
import { series } from '../api'
import { DB } from '../database'
import { useCached } from '../hooks/cached'
import styles from './book-list.module.css'
import { SeriesCard } from './series-card'

interface SeriesListProps {
    listName: string
    series?: string
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    const items = useCached(
        props.listName,
        {},
        DB.series,
        series.list,
        series.cachedList,
    )

    if (items === null) {
        return <div class={styles.bookList}>loading</div>
    }

    return (
        <div class={styles.bookList}>
            {items.map(s => (
                <SeriesCard series={s} />
            ))}
        </div>
    )
}
