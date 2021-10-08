export interface PaginatedResponse<T> {
    total: number
    page: number
    page_size: number
    data: T[]
}