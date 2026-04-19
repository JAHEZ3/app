export enum PaymentMethodType {
  BANK_ACCOUNT = 'bank_account',
  WALLET = 'wallet',
}

export enum BankName {
  BANK_OF_PALESTINE = 'Bank of Palestine',
  PALESTINE_ISLAMIC_BANK = 'Palestine Islamic Bank',
  ARAB_ISLAMIC_BANK = 'Arab Islamic Bank',
}

export enum WalletType {
  PALPAY = 'PalPay',
  JAWWAL_PAY = 'Jawwal Pay',
}

export interface BankAccountPayment {
  type: PaymentMethodType.BANK_ACCOUNT;
  bankName: BankName;
  accountNumber: string;
  iban: string;
  bankPhone?: string; // optional
}

export interface WalletPayment {
  type: PaymentMethodType.WALLET;
  walletType: WalletType;
  accountNumber: string;
  phone: string; // required for wallet
}

export type PaymentInfo = BankAccountPayment | WalletPayment;

// ─── Validation helper (used by the service) ────────────────────────────────

export function parseAndValidatePaymentInfo(raw: string): PaymentInfo {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('paymentInfo must be valid JSON');
  }

  if (parsed.type === PaymentMethodType.BANK_ACCOUNT) {
    if (!Object.values(BankName).includes(parsed.bankName)) {
      throw new Error(
        `bankName must be one of: ${Object.values(BankName).join(', ')}`,
      );
    }
    if (!parsed.accountNumber?.trim())
      throw new Error('accountNumber is required for bank account');
    if (!parsed.iban?.trim())
      throw new Error('iban is required for bank account');

    return {
      type: PaymentMethodType.BANK_ACCOUNT,
      bankName: parsed.bankName as BankName,
      accountNumber: parsed.accountNumber,
      iban: parsed.iban,
      ...(parsed.bankPhone ? { bankPhone: parsed.bankPhone } : {}),
    };
  }

  if (parsed.type === PaymentMethodType.WALLET) {
    if (!Object.values(WalletType).includes(parsed.walletType)) {
      throw new Error(
        `walletType must be one of: ${Object.values(WalletType).join(', ')}`,
      );
    }
    if (!parsed.accountNumber?.trim())
      throw new Error('accountNumber is required for wallet');
    if (!parsed.phone?.trim())
      throw new Error('phone is required for wallet');

    return {
      type: PaymentMethodType.WALLET,
      walletType: parsed.walletType as WalletType,
      accountNumber: parsed.accountNumber,
      phone: parsed.phone,
    };
  }

  throw new Error(
    `paymentInfo.type must be '${PaymentMethodType.BANK_ACCOUNT}' or '${PaymentMethodType.WALLET}'`,
  );
}
