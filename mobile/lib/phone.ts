/**
 * Client-side phone helpers — kept in lock-step with the backend
 * `auth-service/src/utils/phone.util.ts` so the number the app sends always
 * matches the canonical form the server stores and looks up by.
 *
 * Canonical form: E.164, e.g. `+970599123456` / `+972591234567`.
 * Markets served: Palestine (+970) and +972 SIMs. National number = 9 digits.
 */

export const COUNTRY_CODES = ['+970', '+972'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const DEFAULT_COUNTRY_CODE: CountryCode = '+970';

const NATIONAL_LEN = 9;

/** Strip everything but digits from a raw national-number input. */
export function sanitizeNational(input: string): string {
    return input.replace(/\D/g, '').replace(/^0+/, '').slice(0, NATIONAL_LEN);
}

/** A 9-digit national number under a supported code is valid. */
export function isValidNational(national: string): boolean {
    return /^[1-9]\d{8}$/.test(national);
}

/**
 * Build the canonical E.164 string from a country code + national digits.
 * Returns `null` if the national part isn't a valid 9-digit mobile number.
 */
export function toE164(countryCode: CountryCode, national: string): string | null {
    const clean = sanitizeNational(national);
    if (!isValidNational(clean)) return null;
    return `${countryCode}${clean}`;
}

/**
 * Best-effort split of an already-formatted phone back into its parts, used to
 * pre-fill the input when we resume a flow with a stored phone.
 */
export function fromE164(phone: string): { countryCode: CountryCode; national: string } {
    for (const code of COUNTRY_CODES) {
        if (phone.startsWith(code)) {
            return { countryCode: code, national: phone.slice(code.length) };
        }
    }
    return { countryCode: DEFAULT_COUNTRY_CODE, national: sanitizeNational(phone) };
}
