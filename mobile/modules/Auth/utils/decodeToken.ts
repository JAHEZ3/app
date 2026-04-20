export interface JwtPayload {
    sub: string;
    role: string;
    phone: string;
    profileCompleted: boolean;
    iat: number;
    exp: number;
}

export function decodeJwtPayload(token: string): JwtPayload {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(base64)) as JwtPayload;
}
