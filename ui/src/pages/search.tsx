import { bindValue } from '@zwzn/spicy'
import Fuse from 'fuse.js'
import { Fragment, h, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { SeriesList } from 'src/components/series-list'
import { DBSeries } from 'src/database'
import { useQueryState } from 'src/hooks/query-state'
import { useAllSeries } from 'src/hooks/series'
import { Series } from 'src/models'
import styles from 'src/pages/search.module.css'

export function Search(): JSX.Element {
    const [query, setQuery] = useQueryState('q', '')
    const [foundSeries, setFoundSeries] = useState<Series[] | null>(null)
    const search = useRef<HTMLInputElement | null>(null)
    const [allSeries] = useAllSeries({ promptReload: 'never' })
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
        <Fragment>
            <h1 class={styles.title}>Search</h1>
            <input
                class={styles.input}
                type='text'
                ref={search}
                onInput={bindValue(setQuery)}
                value={query}
            />

            <SeriesList series={foundSeries} scroll='vertical' />
        </Fragment>
    )
}
