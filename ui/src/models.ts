export interface Book {
    id: string
    created_at: string
    updated_at: string
    deleted_at: string | null
    title: string
    chapter: number | null
    volume: number | null
    series: string
    authors: string | null
    pages: Page | null
    sort: string
}
export interface Page {
    url: string
    file: string
    type: string
}
export interface Series {
    name: string
    created_at: string
    updated_at: string
    deleted_at: string | null
}
export interface User {
    id: string
    created_at: string
    updated_at: string
    deleted_at: string | null
    name: string
}
