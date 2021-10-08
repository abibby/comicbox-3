import { Book } from "../models";
import { PaginatedResponse } from "./pagination";

export async function list(): Promise<PaginatedResponse<Book>>{
    return await fetch("/api/books").then(r => r.json())
}