import { createContext, useContext, type PropsWithChildren } from 'react';
import { restRepository } from './repository/restRepository';
import { DeliveryRepository } from './repository/DeliveryRepository';

export const DeliveryContext = createContext<DeliveryRepository | null>(null);

export const useDelivery = (): DeliveryRepository => {
    const context = useContext(DeliveryContext);
    if (!context) {
        throw new Error('useDelivery must be used within a DeliveryProvider');
    }
    return context;
};

export const createDeliveryModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <DeliveryContext.Provider value={value}>
                {children}
            </DeliveryContext.Provider>
        ),
    };
};
