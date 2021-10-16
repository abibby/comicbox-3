import { Table } from "dexie"
import { useEffect, useState } from "preact/hooks"
import { PaginatedRequest } from "../api/internal"
import { prompt } from "../components/alert"
import { DB } from "../database"

export function useCached<T, TRequest extends PaginatedRequest>(
    listName: string,
    request: TRequest,
    table: Table<T>,
    network: (req: TRequest) => Promise<T[]>,
    cache: (req: TRequest) => Promise<T[]>,
    promptForChanges: "always" | "never" | "auto" = "auto",
    useCache = false,
): T[] | null {
    const [items, setItems] = useState<T[] | null>(null)

    listName = `${table.name}:${listName}`

    useEffect(() => {
        (async () => {
            if (!useCache){
                const netItems = await network(request)
                setItems(netItems)
                return
            }

            const [
                lastUpdated,
                cacheItems 
            ] = await Promise.all([
                DB.lastUpdated.where('list').equals(listName).first(),
                cache(request),
            ])
            if (lastUpdated === undefined && cacheItems.length === 0) {
                const netItems = await network(request)
                setItems(netItems)
                table.bulkPut(netItems)
                DB.lastUpdated.put({list: listName, updatedAt: new Date().toISOString()})
            } else {
                setItems(cacheItems)
                const netItems = await network({ ...request, updated_after: lastUpdated?.updatedAt })
                if (netItems.length === 0) {
                    return
                }
                table.bulkPut(netItems)
                DB.lastUpdated.put({list: listName, updatedAt: new Date().toISOString()})

                let reload = promptForChanges === "always"
                if (promptForChanges === "auto" && shouldPrompt(cacheItems, netItems)) {
                    reload = await prompt("New "+table.name, { reload: true }, 0) ?? false
                }
                if (reload) {
                    setItems(await cache(request))
                }
            }
        })()
    }, [setItems, ...Object.values(request), listName])
    

    return items
}

function primaryKeyValue(item: unknown): unknown {
    if (typeof item === "object" && item !== null) {
        if ("id" in item) {
            return (item as { id: unknown }).id
        }
        if ("name" in item) {
            return (item as { name: unknown }).name
        }
    }
    return JSON.stringify(item)
}

function shouldPrompt<T>(cacheItems: T[], netItems: T[]): boolean {
    if (cacheItems.length < netItems.length) {
        console.log(cacheItems.length, netItems.length);
        return true
    }

    const netKeys = netItems.map(primaryKeyValue)
    const cacheKeys = netItems.map(primaryKeyValue)
    for (const key of netKeys) {
        if (cacheKeys.indexOf(key) === -1) {
            console.log(key);
            return true
        }
    }
    return false
}