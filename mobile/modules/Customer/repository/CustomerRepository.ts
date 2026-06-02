import type { CustomerAddress, CustomerAddressInput } from '../types';

export interface CustomerRepository {
    getAddresses: () => Promise<CustomerAddress[]>;
    createAddress: (input: CustomerAddressInput) => Promise<CustomerAddress>;
    updateAddress: (id: string, input: CustomerAddressInput) => Promise<CustomerAddress>;
    deleteAddress: (id: string) => Promise<void>;
}
