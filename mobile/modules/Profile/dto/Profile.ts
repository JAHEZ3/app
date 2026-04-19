export type CompleteProfileDto = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    locationLat: number;
    locationLng: number;
    dateOfBirth?: string;
    profileCompleted: boolean;
    createdAt: Date;
};