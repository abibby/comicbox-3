import { FunctionalComponent, h } from 'preact'
import { series } from 'src/api'
import { listNames } from 'src/api/series'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'

export const List: FunctionalComponent = () => {
    const lists = listNames.map(
        ([list, listName]) =>
            [
                listName,
                // eslint-disable-next-line react-hooks/rules-of-hooks
                useCached(list, { list: list }, DB.series, series.list),
            ] as const,
    )

    return (
        <div>
            {lists.map(([list, items]) => (
                <div key={list}>
                    <h1>{list}</h1>
                    <SeriesList series={items ?? []} />
                </div>
            ))}
        </div>
    )
}
