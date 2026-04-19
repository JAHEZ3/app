export interface CustomerProfile {
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    locationLat: number | null;
    locationLng: number | null;
    profileCompleted: boolean;
    createdAt: Date;
}
