import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export const useAuthToken = () => {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkToken = async () => {
        try {
            const t = await SecureStore.getItemAsync('refreshToken');
            setToken(t);
        } catch (error) {
            console.log('Error fetching token:', error);
        } finally {
            setLoading(false);
        }
        };
        checkToken();
    }, []);

    return { token, loading };
};