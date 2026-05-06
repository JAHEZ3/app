import { createContext, useContext, type PropsWithChildren } from 'react';
import { restRepository } from './repository/restRepository';
import { OrderRepository } from './repository/OrderRepository';

export const OrderContext = createContext<OrderRepository | null>(null);

export const useOrderRepository = (): OrderRepository => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrderRepository must be used within an OrderProvider');
    }
    return context;
};

export const createOrderModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <OrderContext.Provider value={value}>
                {children}
            </OrderContext.Provider>
        ),
    };
};
