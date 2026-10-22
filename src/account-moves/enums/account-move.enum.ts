export enum AccountMoveState {
  DRAFT = "draft",
  POSTED = "posted",
  CANCELLED = "cancelled",
}

export enum AccountMoveType {
  ENTRY = "entry",
  IN_INVOICE = "in_invoice",
  OUT_INVOICE = "out_invoice",
  OUT_REFUND = "out_refund",
  IN_REFUND = "in_refund",
  IN_PAYMENT = "in_payment",
  OUT_PAYMENT = "out_payment",
}
