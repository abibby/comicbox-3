import Dexie, { Collection } from 'dexie'
import { series } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Series, SeriesOrder } from 'src/models'

setCacheHandler(series.list, async (req): Promise<Series[]> => {
    let query: Collection<Series>

    if (req.name !== undefined) {
        query = DB.series.where('name').equals(req.name)
    } else if (req.list !== undefined) {
        if (req.order == SeriesOrder.LastRead) {
            query = DB.series
                .where(['user_series.list', 'user_series.last_read_at'])
                .between([req.list, Dexie.minKey], [req.list, Dexie.maxKey])
                .reverse()
        } else {
            query = DB.series.where('user_series.list').equals(req.list)
        }
    } else {
        query = DB.series.orderBy('name')
    }

    if (req.limit !== undefined) {
        query = query.limit(req.limit)
    }
    return query.toArray()
})
