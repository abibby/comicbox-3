import { Fragment, h, JSX } from 'preact'
import { seriesAPI } from 'src/api'
import { AllPagesRequest } from 'src/api/internal'
import { listNames, SeriesListRequest } from 'src/api/series'
import { useCached } from 'src/cache'
import { CardList } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { DB } from 'src/database'
import { SeriesOrder } from 'src/models'
import { route } from 'src/routes'
import styles from 'src/pages/library.module.css'
import { IconButton } from 'src/components/button'
import { Settings } from 'preact-feather'

export function Library(): JSX.Element {
    return (
        <Fragment>
            <section class={styles.profile}>
                <h1>My Profile</h1>
                <IconButton
                    color='clear'
                    icon={Settings}
                    href={route('settings')}
                />
            </section>
            {listNames.map(([list, listName]) => (
                <SeriesRow
                    key={listName}
                    listName={listName}
                    href={route('list', { list: list })}
                    request={{
                        list: list,
                        limit: 10,
                        order_by: SeriesOrder.LastRead,
                    }}
                />
            ))}
            <SeriesRow
                listName='All Series'
                href={route('series.index')}
                request={{ limit: 10, order_by: SeriesOrder.LastRead }}
            />
        </Fragment>
    )
}

interface SeriesRowProps {
    listName: string
    href: string
    request: AllPagesRequest<SeriesListRequest>
}
function SeriesRow(props: SeriesRowProps): JSX.Element {
    const items = useCached({
        listName: props.listName,
        request: props.request,
        table: DB.series,
        network: seriesAPI.list,
    })
    return (
        <CardList title={props.listName} link={props.href} scroll='horizontal'>
            {items?.map(s => (
                <SeriesCard key={s.name} series={s} />
            ))}
        </CardList>
    )
}
