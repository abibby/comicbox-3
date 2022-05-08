import { bind } from '@zwzn/spicy'
import { h } from 'preact'
import { searchManga, SearchMangaResponse } from 'src/api/anilist'
import { useAsyncCallback } from 'src/hooks/async'
import { Series } from 'src/models'
import styles from './anilist-match.module.css'
import { Card } from './card'
import { Modal, ModalBody, ModalComponent, ModalHead } from './modal'

type AnilistMatchProps = {
    series: Series
}

export const AnilistMatch: ModalComponent<
    number | undefined,
    AnilistMatchProps
> = props => {
    const seriesName = props.series.name
    const result = useAsyncCallback(async () => {
        return searchManga(seriesName)
    }, [seriesName])

    let data: SearchMangaResponse[] = []

    if (result.status === 'success') {
        data = result.data.results
    }

    return (
        <Modal>
            <ModalHead close={props.close}>Anilist Match</ModalHead>
            <ModalBody>
                <div class={styles.bookList}>
                    {data.map(r => (
                        <Card
                            title={r.title.userPreferred}
                            subtitle={r.title.english}
                            image={r.coverImage.large}
                            link={bind(r.id, props.close)}
                        />
                    ))}
                </div>
            </ModalBody>
        </Modal>
    )
}
