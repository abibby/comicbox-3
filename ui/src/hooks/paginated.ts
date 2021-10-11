import { Inputs, useEffect, useState } from "preact/hooks";
import { PaginatedRequest, PaginatedResponse } from "../api/pagination";
import { prompt } from "../components/alert";
import { AsyncResponse } from "./async";

export function usePaginated<T>(
    network: (r: PaginatedRequest) => Promise<PaginatedResponse<T>>,
    cache: (r: PaginatedRequest) => Promise<PaginatedResponse<T>>,
    request: PaginatedRequest,
    inputs: Inputs
): AsyncResponse<PaginatedResponse<T>, Error> {
    const [value, setValue] = useState<AsyncResponse<PaginatedResponse<T>, Error>>({
        loading: true,
        result: undefined,
        error: undefined,
    })

    useEffect(() => {
        function error(e: Error) {
            setValue({
                loading: false,
                result: undefined,
                error: e,
            })
        }
        cache(request).then(r => {
            
        }).catch(error)
        network(request).then(r => {
            prompt("New results", { "reload": true, }, 0)
            setValue({
                loading: false,
                result: r,
                error: undefined,
            })
        }).catch(error)
    }, [setValue, request.page, request.page_size, ...inputs])

    return value
}