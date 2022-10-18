import { bind } from '@zwzn/spicy'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { searchManga, SearchMangaResponse } from 'src/api/anilist'
import styles from 'src/components/anilist-match.module.css'
import { Card } from 'src/components/card'
import { Input } from 'src/components/form/input'
import {
    Modal,
    ModalBody,
    ModalComponent,
    ModalHead,
} from 'src/components/modal'
import { useAsyncCallback } from 'src/hooks/async'
import { Series } from 'src/models'

type AnilistMatchProps = {
    series: Series
}

export const AnilistMatch: ModalComponent<
    number | undefined,
    AnilistMatchProps
> = props => {
    const seriesName = props.series.name
    const [search, setSearch] = useState(seriesName)
    const result = useAsyncCallback(async () => {
        return searchManga(search)
    }, [search])

    let data: SearchMangaResponse[] = []

    if (result.status === 'success') {
        data = result.data.results
    }

    return (
        <Modal>
            <ModalHead close={props.close}>Anilist Match</ModalHead>
            <ModalBody>
                <Input
                    title='Search'
                    name='search'
                    value={search}
                    onInput={setSearch}
                />
                <div class={styles.bookList}>
                    {data.map(r => {
                        const current = props.series.anilist_id === r.id
                        let subtitle: string = r.format
                        if (r.title.english) {
                            subtitle += ' • ' + r.title.english
                        }
                        return (
                            <Card
                                title={
                                    r.title.userPreferred +
                                    (current ? ' (current)' : '')
                                }
                                subtitle={subtitle}
                                image={r.coverImage.large}
                                link={bind(r.id, props.close)}
                                progress={current ? 1 : 0}
                            />
                        )
                    })}
                </div>
            </ModalBody>
        </Modal>
    )
}
