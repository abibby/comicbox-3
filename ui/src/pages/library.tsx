import { h, JSX } from 'preact'
import { listNames } from 'src/api/series'
import { route } from 'src/routes'

export function Library(): JSX.Element {
    return (
        <div>
            {listNames.map(([list, listName]) => (
                <a href={route('list', { list: list })}>{listName}</a>
            ))}
            <a href={route('series.index', {})}>Series</a>
        </div>
    )
}
