import { createContext, useContext, type PropsWithChildren } from 'react';
import { restRepository } from './repository/restRepository';
import { RestaurantsRepository } from './repository/RestaurantsRepository';

export const RestaurantsContext = createContext<RestaurantsRepository | null>(null);

export const useRestaurantsRepository = (): RestaurantsRepository => {
    const context = useContext(RestaurantsContext);
    if (!context) {
        throw new Error('useRestaurantsRepository must be used within a RestaurantsProvider');
    }
    return context;
};

export const createRestaurantsModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <RestaurantsContext.Provider value={value}>
                {children}
            </RestaurantsContext.Provider>
        ),
    };
};
