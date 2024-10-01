import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { seriesAPI } from 'src/api'
import { listNamesMap } from 'src/api/series'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'
import { List as LList } from 'src/models'
import { Error404 } from 'src/pages/errors'

export const List: FunctionalComponent = () => {
    const { params } = useRoute()
    const list = params.list ?? ''
    const s = useCached({
        listName: list,
        request: { list: list },
        table: DB.series,
        network: seriesAPI.list,
    })

    if (!isList(list)) {
        return <Error404 />
    }

    return (
        <SeriesList
            title={listNamesMap.get(list)}
            scroll='vertical'
            series={s ?? []}
        />
    )
}

function isList(v: unknown): v is LList {
    return Object.values(LList).includes(v as LList)
}
