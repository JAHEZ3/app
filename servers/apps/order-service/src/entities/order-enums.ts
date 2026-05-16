export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  CARD = 'card',
  ONLINE = 'online',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum OrderKind {
  ONLINE = 'online',
  LOCAL = 'local',
}

export enum LocalServiceType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
}

export enum LocalOrderStatus {
  // Customer submitted via QR scan and is waiting for staff to accept/reject.
  // No kitchen activity yet; bill is read-only until accepted.
  PENDING = 'pending',
  // Staff are still ringing up items / collecting payment (legacy bills
  // created before PREPARING-on-create; new flow skips OPEN).
  OPEN = 'open',
  // Live state: kitchen is preparing, cashier can edit items and discounts,
  // 15-minute countdown is visible. Closes manually to DONE when paid.
  PREPARING = 'preparing',
  // Bill closed and paid — terminal state. Reached only via explicit cashier
  // action; the timer no longer auto-finalizes.
  DONE = 'done',
  // Cancelled / rejected before fulfilment.
  VOIDED = 'voided',
}
