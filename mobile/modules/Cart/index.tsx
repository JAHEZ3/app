import { createContext, useContext, type PropsWithChildren } from 'react';
import { restRepository } from './repository/restRepository';
import { CartRepository } from './repository/CartRepository';

export const CartContext = createContext<CartRepository | null>(null);

export const useCartRepository = (): CartRepository => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCartRepository must be used within a CartProvider');
    }
    return context;
};

export const createCartModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <CartContext.Provider value={value}>
                {children}
            </CartContext.Provider>
        ),
    };
};
