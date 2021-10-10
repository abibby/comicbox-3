import { Inputs } from "preact/hooks";
import { PaginatedResponse } from "../api/pagination";

export function usePaginated<T, TArgs extends []>(cb: (...args: TArgs) => Promise<PaginatedResponse<T>>, args: TArgs, input: Inputs): T[] {
    return []
}