import Dexie, { Collection } from 'dexie'
import { seriesAPI } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Series, SeriesOrder } from 'src/models'

setCacheHandler(seriesAPI.list, async (req): Promise<Series[]> => {
    let query: Collection<Series>

    if (req.name !== undefined) {
        query = DB.series.where('name').equals(req.name)
    } else if (req.list !== undefined) {
        if (req.order_by == SeriesOrder.LastRead) {
            query = DB.series
                .where(['user_series.list', 'user_series.last_read_at'])
                .between([req.list, Dexie.minKey], [req.list, Dexie.maxKey])
                .reverse()
        } else {
            query = DB.series.where('user_series.list').equals(req.list)
        }
    } else {
        let orderColumn = 'name'
        switch (req.order_by) {
            case SeriesOrder.LastRead:
                orderColumn = 'user_series.last_read_at'
                break
            case SeriesOrder.CreatedAt:
                orderColumn = 'created_at'
                break
        }
        if (req.order === 'desc') {
            query = DB.series.orderBy(orderColumn).reverse()
        } else {
            query = DB.series.orderBy(orderColumn)
        }
    }

    if (req.limit !== undefined) {
        query = query.limit(req.limit)
    }
    return query.toArray()
})
