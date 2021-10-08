export interface PaginatedResponse<T> {
    total: number
    page: number
    data: T[]
}