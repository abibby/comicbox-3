import { Inputs, useEffect, useState } from "preact/hooks";
import { PaginatedResponse } from "../api/pagination";
import { prompt } from "../components/alert";
import { AsyncResponse } from "./async";

export function usePaginated<T, TArgs extends []>(
    network: (...args: TArgs) => Promise<PaginatedResponse<T>>,
    cache: (...args: TArgs) => Promise<PaginatedResponse<T>>,
    args: TArgs,
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
        cache(...args).then(r => {

        }).catch(error)
        network(...args).then(r => {
            prompt("New results", { "reload": true, }, 0)
            setValue({
                loading: false,
                result: r,
                error: undefined,
            })
        }).catch(error)
    }, [setValue, ...args, ...inputs])

    return value
}