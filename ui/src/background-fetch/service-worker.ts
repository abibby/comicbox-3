// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../node_modules/@types/serviceworker/index.d.ts" />

import {
    ArgsMap,
    BackgroundFetchRPCRequest,
    BackgroundFetchRPCResponse,
    ResponseMap,
} from 'src/background-fetch/internal'
import {
    BackgroundFetchOptions,
    BackgroundFetchRegistration,
} from 'src/background-fetch'

const activeFetches = new Map<string, BackgroundFetchRegistration>()

addEventListener('message', function (event) {
    const request: BackgroundFetchRPCRequest<keyof ArgsMap> = event.data

    function respond(result: ResponseMap[keyof ResponseMap]) {
        const response: BackgroundFetchRPCResponse<keyof ResponseMap> = {
            type: request.type,
            id: request.id,
            result: result,
        }
        event.source?.postMessage(response)
    }
    function respondError(error: Error) {
        const response: BackgroundFetchRPCResponse<keyof ResponseMap> = {
            type: request.type,
            id: request.id,
            error: error,
        }
        event.source?.postMessage(response)
    }

    function run(p: Promise<ResponseMap[keyof ResponseMap]>) {
        event.waitUntil(p.then(respond).catch(respondError))
    }

    switch (request.type) {
        case 'background-fetch-polyfill:fetch':
            run(bgFetch(...(request.args as ArgsMap['fetch'])))
            break
        case 'background-fetch-polyfill:get':
            break
        case 'background-fetch-polyfill:getIds':
            break
    }
})

async function bgFetch(
    id: string,
    requests: RequestInfo | RequestInfo[],
    _options?: BackgroundFetchOptions,
): Promise<BackgroundFetchRegistration> {
    let registration: BackgroundFetchRegistration
    let records: unknown[]
    let uploadTotal = 0

    if (activeFetches.has(id)) {
        throw new TypeError('There already is a registration for the given id.')
    }

    if (!Array.isArray(requests)) {
        requests = [requests]
    }
    if (requests.length === 0) {
        throw new TypeError(
            "Failed to execute 'fetch' on 'BackgroundFetchManager': At least one request must be given.",
        )
    }

    // const fetches: Promise<Response>[] = []
    // for (const request of requests) {
    //     fetches.push(fetch(request, {}))
    // }

    const workers: Promise<void>[] = []
    for (let i = 0; i < 3; i++) {
        workers.push(
            (async () => {
                fetch()
            })(),
        )
    }
    await Promise.all(workers)
    activeFetches.set

    const responses = Promise.all(fetches)

    return
}
