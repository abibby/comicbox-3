import { FunctionalComponent, h } from 'preact'
import { series } from '../api'
import { useCached } from '../cache'
import { DB } from '../database'
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
