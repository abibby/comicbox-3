import { bindValue } from '@zwzn/spicy'
import Fuse from 'fuse.js'
import { h, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { series } from 'src/api'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB, DBSeries } from 'src/database'
import { useQueryState } from 'src/hooks/query-state'
import { Series } from 'src/models'
import styles from 'src/pages/search.module.css'

export function Search(): JSX.Element {
    const [query, setQuery] = useQueryState('q', '')
    const [foundSeries, setFoundSeries] = useState<Series[] | null>(null)
    const search = useRef<HTMLInputElement | null>(null)
    const allSeries = useCached('series', {}, DB.series, series.list, 'never')
    const [fuse, setFuse] = useState<Fuse<DBSeries>>()
    useEffect(() => {
        if (allSeries === null) {
            setFuse(undefined)
        } else {
            setFuse(
                new Fuse(allSeries, {
                    keys: ['name'],
                }),
            )
        }
    }, [allSeries])
    useEffect(() => {
        if (query === '' || fuse === undefined) {
            setFoundSeries([])
        } else {
            setFoundSeries(fuse.search(query, { limit: 10 }).map(r => r.item))
        }
    }, [query, fuse])

    useEffect(() => {
        search.current?.focus()
    }, [])

    return (
        <div>
            <h1>Search</h1>
            <input
                class={styles.input}
                type='text'
                ref={search}
                onInput={bindValue(setQuery)}
                value={query}
            />

            <SeriesList series={foundSeries} />
        </div>
    )
}
