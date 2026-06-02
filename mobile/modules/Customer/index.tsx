import { createContext, useContext, type PropsWithChildren } from 'react';
import { restRepository } from './repository/restRepository';
import { CustomerRepository } from './repository/CustomerRepository';

export const CustomerContext = createContext<CustomerRepository | null>(null);

export const useCustomerRepository = (): CustomerRepository => {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error('useCustomerRepository must be used within a CustomerProvider');
    }
    return context;
};

export const createCustomerModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <CustomerContext.Provider value={value}>
                {children}
            </CustomerContext.Provider>
        ),
    };
};
