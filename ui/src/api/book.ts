import { Book } from "../models";
import { encodeParams, PaginatedResponse } from "./pagination";

export type BookListRequest = {
    page_size?: number
    page?: number
    id?: string
}

export async function list(req: BookListRequest = {}): Promise<PaginatedResponse<Book>> {
    return await fetch("/api/books?" + encodeParams(req)).then(r => r.json())
}