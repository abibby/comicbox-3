import { Table } from "dexie"
import { useEffect, useState } from "preact/hooks"
import { allPages, PaginatedRequest, PaginatedResponse } from "../api/internal"
import { prompt } from "../components/alert"
import { DB } from "../database"

export function useCached<T, TRequest extends PaginatedRequest>(
    listName: string,
    request: TRequest,
    table: Table<T>,
    network: (req: TRequest) => Promise<PaginatedResponse<T>>,
    cache: (req: TRequest) => Promise<T[]>,
): T[] | null {
    const [items, setItems] = useState<T[] | null>(null)

    listName = `${table.name}:${listName}`

    useEffect(() => {
        (async () => {
            const [
                lastUpdated,
                cacheBooks 
            ] = await Promise.all([
                DB.lastUpdated.where('list').equals(listName).first(),
                cache(request),
            ])
            if (lastUpdated === undefined && cacheBooks.length === 0) {
                const netBooks = await allPages(network, request)
                setItems(netBooks)
                table.bulkPut(netBooks)
                DB.lastUpdated.put({list: listName, updatedAt: new Date().toISOString()})
            } else {
                setItems(cacheBooks)
                const netBooks = await allPages(network, { ...request, updated_after: lastUpdated?.updatedAt })
                if (netBooks.length === 0) {
                    return
                }
                table.bulkPut(netBooks)
                DB.lastUpdated.put({list: listName, updatedAt: new Date().toISOString()})

                const reload = await prompt("New books", { reload: true }, 0)
                if (reload) {
                    setItems(await cache(request))
                }
            }
        })()
    }, [setItems, ...Object.values(request), listName])

    return items
}