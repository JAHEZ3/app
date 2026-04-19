import { useQuery } from "@tanstack/react-query";
import { useProfile } from ".."

export const useGetProfile = () => {
    const { getProfile } = useProfile();
    return useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
    });
};