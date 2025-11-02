import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { listNamesMap } from 'src/api/series'
import { SeriesList } from 'src/components/series-list'
import { seriesKey, usePromptUpdate } from 'src/hooks/prompt-update'
import { useSeriesList } from 'src/hooks/series'
import { List as LList } from 'src/models'
import { Error404 } from 'src/pages/errors'

export const List: FunctionalComponent = () => {
    const { params } = useRoute()
    const list = params.list ?? ''
    const [liveSeries, loading] = useSeriesList(list, {
        list: list,
        limit: null,
    })

    const series = usePromptUpdate(liveSeries, seriesKey)

    if (!isList(list)) {
        return <Error404 />
    }

    return (
        <SeriesList
            title={listNamesMap.get(list)}
            scroll='vertical'
            series={series}
            loading={loading}
        />
    )
}

export function isList(v: unknown): v is LList {
    return Object.values(LList).includes(v as LList)
}
