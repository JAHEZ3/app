import { createContext, useContext, type PropsWithChildren } from "react";
import { restRepository } from "./repository/restRepository";
import { ProfileRepository } from "./repository/ProfileRepository";

export const ProfileContext = createContext<ProfileRepository | null>(null);

type ProfileProviderShape = PropsWithChildren<{
    value: ProfileRepository | null,
}>

const ProfileProvider = ({ value, children }: ProfileProviderShape) => {
    return(
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    )
}

export default ProfileProvider;


export const useProfile = () => {
    const context = useContext(ProfileContext);
    if(!context) {
        throw new Error("useAuth must be used within a AuthProvider");
    }
    return context;
};

export const createProfileModule = () => {
    const value = restRepository();
    return {
        Provider: ({ children }: PropsWithChildren) => (
            <ProfileContext value={value}>{children}</ProfileContext>
        )
    }
};