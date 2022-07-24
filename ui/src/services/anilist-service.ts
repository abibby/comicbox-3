import { anilist, series } from 'src/api'
import { DBBook } from 'src/database'

export async function updateAnilist(b: DBBook): Promise<void> {
    const [s] = await series.list({
        name: b.series,
    })
    if (s === undefined || s.anilist_id === null) {
        return
    }

    anilist.updateManga({
        mediaId: s.anilist_id,
        progress: b.chapter,
        progressVolumes: b.volume,
        // startedAt: ,
    })
}
