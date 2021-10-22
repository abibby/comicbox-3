import { FunctionalComponent, h } from 'preact'
import { Series } from '../models'
import styles from './book-list.module.css'
import { SeriesCard } from './series-card'

interface SeriesListProps {
    series: Series[]
}

export const SeriesList: FunctionalComponent<SeriesListProps> = props => {
    return (
        <div class={styles.bookList}>
            {props.series.map(s => (
                <SeriesCard series={s} />
            ))}
        </div>
    )
}
