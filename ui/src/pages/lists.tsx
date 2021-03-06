import { FunctionalComponent, h } from 'preact'
import { series } from '../api'
import { listNames } from '../api/series'
import { useCached } from '../cache'
import { SeriesList } from '../components/series-list'
import { DB } from '../database'

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
