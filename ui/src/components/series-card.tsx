import { FunctionalComponent, h } from 'preact'
import { Card } from 'src/components/card'
import { ContextMenuItems } from 'src/components/context-menu'
import { usePageURL } from 'src/hooks/page'
import { post } from 'src/message'
import { Series } from 'src/models'
import { route } from 'src/routes'
import { openModal } from 'src/components/modal-controller'
import { useMemo } from 'preact/hooks'
import { encode } from 'src/util'

interface SeriesCardProps {
    series: Series
}

export const SeriesCard: FunctionalComponent<SeriesCardProps> = props => {
    const menu = useMemo<ContextMenuItems>(() => {
        return [
            ['Edit', () => openModal(encode`/series/${props.series.slug}`)],
            [
                'Download',
                () =>
                    post({
                        type: 'download-series',
                        seriesSlug: props.series.name,
                    }),
            ],
        ]
    }, [props.series.name, props.series.slug])

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
