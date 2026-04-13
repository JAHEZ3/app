export interface CountryCode {
  code: string;
  flag: string;
  dialCode: string;
}

export interface PhoneInputState {
  countryCode: CountryCode;
  phoneNumber: string;
}
