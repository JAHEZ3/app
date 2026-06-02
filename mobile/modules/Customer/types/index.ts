export interface CustomerAddress {
    id: string;
    label?: string;
    street?: string;
    city?: string;
    building?: string;
    floor?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
}

export interface CustomerAddressInput {
    label?: string;
    street?: string;
    city?: string;
    building?: string;
    floor?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
}

export interface CustomerAddressListResponse {
    data: CustomerAddress[];
    message?: string | null;
}

export interface CustomerAddressResponse {
    data: CustomerAddress;
    message?: string | null;
}
