import { FunctionalComponent, h } from 'preact'
import styles from 'src/components/book-list.module.css'
import { Card } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { Series } from 'src/models'

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
                <SeriesCard key={s.name} series={s} />
            ))}
        </div>
    )
}
