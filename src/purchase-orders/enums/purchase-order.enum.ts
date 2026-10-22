export enum PurchaseOrderType {
  ADHOC = "adhoc",
  REGULAR = "regular",
}

export enum PurchaseOrderState {
  DRAFT = "draft",
  TO_APPROVE = "to_approve",
  APPROVED = "approved",
  BILLED = "billed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}
