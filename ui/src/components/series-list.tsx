import { FunctionalComponent, h } from 'preact'
import { Series } from '../models'
import styles from './book-list.module.css'
import { Card } from './card'
import { SeriesCard } from './series-card'

interface SeriesListProps {
    series: Series[] | null
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    if (props.series === null) {
        return (
            <div class={styles.bookList}>
                <Card title='title' placeholder />
            </div>
        )
    }
    return (
        <div class={styles.bookList}>
            {props.series.map(s => (
                <SeriesCard series={s} />
            ))}
        </div>
    )
}
