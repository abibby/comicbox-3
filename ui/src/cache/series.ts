import Dexie, { Collection } from 'dexie'
import { AllPagesRequest } from 'src/api/internal'
import { SeriesListRequest } from 'src/api/series'
import { DB, emptyUserSeries } from 'src/database'
import { Series, SeriesOrder } from 'src/models'

export async function seriesCache(
    req: AllPagesRequest<SeriesListRequest>,
): Promise<Series[]> {
    let query: Collection<Series>

    if (req.slug !== undefined) {
        query = DB.series.where('slug').equals(req.slug)
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

    if (req.limit !== null) {
        query = query.limit(req.limit)
    }

    const series = await query.toArray()

    await Promise.all(
        series.map(async (s): Promise<void> => {
            const latestBook = await DB.books
                .where(['series_slug', 'completed', 'sort'])
                .between([s.slug, 0, Dexie.minKey], [s.slug, 0, Dexie.maxKey])
                .first()

            s.user_series = {
                ...emptyUserSeries,
                ...s.user_series,
                latest_book: latestBook ?? null,
                latest_book_id: latestBook?.id ?? null,
            }
        }),
    )

    if (req.order_by === SeriesOrder.LastRead) {
        series.sort((a, b) => {
            if (!a.user_series && !b.user_series) {
                return 0
            }
            if (!a.user_series) {
                return 1
            }
            if (!b.user_series) {
                return -1
            }
            return b.user_series.last_read_at.localeCompare(
                a.user_series.last_read_at,
            )
        })
    }
    return series
}
