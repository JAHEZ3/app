import { createContext, useContext, type PropsWithChildren } from "react";
import { restRepository } from "./repository/restRepository";
import { AuthRepository } from "./repository/AuthRepository";

export const AuthContext = createContext<AuthRepository | null>(null);

type AuthProviderShape = PropsWithChildren<{
    value: AuthRepository | null,
}>

const AuthProvider = ({ value, children }: AuthProviderShape) => {
    return(
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;


export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context) {
        throw new Error("useAuth must be used within a AuthProvider");
    }
    return context;
};

export const createAuthModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <AuthContext value={value}>{children}</AuthContext>
        )
    }
};