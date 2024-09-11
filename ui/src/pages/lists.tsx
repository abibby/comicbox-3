import { FunctionalComponent, h } from 'preact'
import { useRoute } from 'preact-iso'
import { series } from 'src/api'
import { listNamesMap } from 'src/api/series'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'
import { List as LList } from 'src/models'
import { Error404 } from 'src/pages/errors'

export const List: FunctionalComponent = () => {
    const { params } = useRoute()
    const list = params.list ?? ''
    const s = useCached(list, { list: list }, DB.series, series.list)

    if (!isList(list)) {
        return <Error404 />
    }

    return (
        <div>
            <h1>{listNamesMap.get(list)}</h1>
            <SeriesList scroll='vertical' series={s ?? []} />
        </div>
    )
}

function isList(v: unknown): v is LList {
    return Object.values(LList).includes(v as LList)
}
