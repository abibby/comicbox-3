import { DBSeries } from 'src/database'
import { List } from 'src/models'
import { PartialDeep } from 'src/test/mode'

export function newTestSeries(s: PartialDeep<DBSeries>): DBSeries {
    return {
        created_at: '1970-01-01T00:00:00Z',
        updated_at: '1970-01-01T00:00:00Z',
        deleted_at: null,
        update_map: {},
        name: '',
        cover_url: '',
        first_book_id: null,
        anilist_id: null,
        ...s,
        user_series: {
            created_at: '1970-01-01T00:00:00Z',
            updated_at: '1970-01-01T00:00:00Z',
            deleted_at: null,
            update_map: {},
            list: List.None,
            latest_book_id: null,
            ...s.user_series,
        },
    }
}
