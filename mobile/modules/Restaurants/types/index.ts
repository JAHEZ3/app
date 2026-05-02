export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface RestaurantsQueryParams {
    page?: number;
    limit?: number;
    city?: string;
    cuisineType?: string;
    search?: string;
}
