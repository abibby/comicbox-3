import { FunctionalComponent, h } from 'preact'
import { SeriesList } from '../components/series-list'

export const SeriesIndex: FunctionalComponent = () => {
    return (
        <div>
            <h1>Series</h1>
            <SeriesList listName='series-index' />
        </div>
    )
}
