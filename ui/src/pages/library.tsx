import { Fragment, h, JSX } from 'preact'
import { series } from 'src/api'
import { AllPagesRequest } from 'src/api/internal'
import { listNames, SeriesListRequest } from 'src/api/series'
import { useCached } from 'src/cache'
import { CardList } from 'src/components/card'
import { SeriesCard } from 'src/components/series-card'
import { DB } from 'src/database'
import { SeriesOrder } from 'src/models'
import { route } from 'src/routes'

export function Library(): JSX.Element {
    return (
        <Fragment>
            {listNames.map(([list, listName]) => (
                <SeriesRow
                    key={listName}
                    listName={listName}
                    href={route('list', { list: list })}
                    request={{
                        list: list,
                        limit: 10,
                        order: SeriesOrder.LastRead,
                    }}
                />
            ))}
            <SeriesRow
                listName='All Series'
                href={route('series.index', {})}
                request={{ limit: 10, order: SeriesOrder.LastRead }}
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
    const items = useCached(
        props.listName,
        props.request,
        DB.series,
        series.list,
    )
    return (
        <CardList title={props.listName} link={props.href} scroll='horizontal'>
            {items?.map(s => (
                <SeriesCard key={s.name} series={s} />
            ))}
        </CardList>
    )
}
