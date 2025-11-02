import { Fragment, h, JSX } from 'preact'
import { AllPagesRequest } from 'src/api/internal'
import { listNames, SeriesListRequest } from 'src/api/series'
import { SeriesOrder } from 'src/models'
import { route } from 'src/routes'
import styles from 'src/pages/library.module.css'
import { Button } from 'src/components/button'
import { Settings } from 'preact-feather'
import { useSeriesList } from 'src/hooks/series'
import { SeriesList } from 'src/components/series-list'
import { seriesKey, usePromptUpdate } from 'src/hooks/prompt-update'

export function Profile(): JSX.Element {
    return (
        <Fragment>
            <section class={styles.profile}>
                <h1>My Profile</h1>
                <Button
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
    const [liveSeries, loading] = useSeriesList(props.listName, props.request)
    const series = usePromptUpdate(liveSeries, seriesKey)
    return (
        <SeriesList
            title={props.listName}
            link={props.href}
            scroll='horizontal'
            series={series}
            loading={loading}
        />
    )
}
