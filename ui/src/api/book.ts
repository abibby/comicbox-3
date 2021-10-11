import { Book } from "../models";
import { encodeParams, PaginatedRequest, PaginatedResponse } from "./pagination";

export type BookListRequest = 
    & PaginatedRequest
    & {
        id?: string
    }

export async function list(req: BookListRequest = {}): Promise<PaginatedResponse<Book>> {
    return await fetch("/api/books?" + encodeParams(req)).then(r => r.json())
}