import { h, JSX } from 'preact'
import { series } from 'src/api'
import { AllPagesRequest } from 'src/api/internal'
import { listNames, SeriesListRequest } from 'src/api/series'
import { useCached } from 'src/cache'
import { SeriesCard } from 'src/components/series-card'
import { DB } from 'src/database'
import { SeriesOrder } from 'src/models'
import styles from 'src/pages/library.module.css'
import { route } from 'src/routes'

export function Library(): JSX.Element {
    return (
        <div>
            <h1>Library</h1>
            {listNames.map(([list, listName]) => (
                <SeriesRow
                    listName={listName}
                    cacheName={list}
                    request={{
                        list: list,
                        limit: 10,
                        order: SeriesOrder.LastRead,
                    }}
                />
            ))}
            <SeriesRow
                listName='All Series'
                cacheName='library-all-series'
                request={{ limit: 10, order: SeriesOrder.LastRead }}
            />
        </div>
    )
}

interface SeriesRowProps {
    listName: string
    cacheName: string
    request: AllPagesRequest<SeriesListRequest>
}
function SeriesRow(props: SeriesRowProps): JSX.Element {
    const items = useCached(
        props.listName,
        props.request,
        DB.series,
        series.list,
    )
    return (
        <div class={styles.seriesRow}>
            <h3 class={styles.title}>{props.listName}</h3>
            <a
                class={styles.more}
                href={route('list', { list: props.cacheName })}
            >
                see all
            </a>
            <div class={styles.cards}>
                {items?.map(s => (
                    <SeriesCard series={s} />
                ))}
            </div>
        </div>
    )
}
