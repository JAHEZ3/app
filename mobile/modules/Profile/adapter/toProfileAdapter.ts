import { CompleteProfileDto } from "../dto/Profile";
import type { CustomerProfile } from "../entities/Profile";

export const toProfileAdapter = (raw: CompleteProfileDto): CustomerProfile => ({
    id: raw.id,
    userId: raw.userId,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    dateOfBirth: raw.dateOfBirth ?? null,
    locationLat: raw.locationLat != null ? Number(raw.locationLat) : null,
    locationLng: raw.locationLng != null ? Number(raw.locationLng) : null,
    profileCompleted: raw.profileCompleted ?? false,
    createdAt: raw.createdAt,
});
