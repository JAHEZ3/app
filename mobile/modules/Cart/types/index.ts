export interface CartOptionInput {
    optionId: string;
    optionName: string;
    extraPrice: number;
}

export interface AddToCartInput {
    restaurantId: string;
    restaurantName: string;
    mealId: string;
    mealName: string;
    mealImage?: string;
    basePrice: number;
    quantity: number;
    specialInstructions?: string;
    options?: CartOptionInput[];
}

export interface UpdateCartItemInput {
    quantity: number;
    specialInstructions?: string;
}

export interface CartOption {
    optionId: string;
    optionName: string;
    extraPrice: number;
}

export interface CartItem {
    mealId: string;
    mealName: string;
    mealImage: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    specialInstructions?: string;
    options: CartOption[];
}

export interface Cart {
    restaurantId: string;
    restaurantName: string;
    items: CartItem[];
    subtotal: number;
}

export interface CartResponse {
    data: Cart | { items: []; subtotal: 0 };
    message: string | null;
}
