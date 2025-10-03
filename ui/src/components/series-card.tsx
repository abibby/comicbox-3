import { FunctionalComponent, h } from 'preact'
import { Card } from 'src/components/card'
import { ContextMenuItem } from 'src/components/context-menu'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { Series } from 'src/models'
import { route } from 'src/routes'
import { openModal } from 'src/components/modal-controller'
import { useMemo } from 'preact/hooks'
import { encode } from 'src/util'
import { useHasScope } from 'src/api/auth'

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const seriesWrite = useHasScope('series:write')
    const menu = useMemo<ContextMenuItem[]>(() => {
        return [
            {
                label: 'Edit',
                action: () => openModal(encode`/series/${props.series.slug}`),
                active: seriesWrite,
            },
            {
                label: 'Download',
                action: () =>
                    post({
                        type: 'download-series',
                        seriesSlug: props.series.name,
                    }),
            },
        ]
    }, [props.series.name, props.series.slug, seriesWrite])

    const coverURL = usePageURL(props.series)

    return (
        <Card
            image={coverURL}
            link={route('series.view', { series: props.series.slug })}
            title={props.series.name}
            subtitle={props.series.year?.toString()}
            menu={menu}
        />
    )
}
