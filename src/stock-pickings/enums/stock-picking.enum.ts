export enum PickingType {
  RECEIPT = "receipt", // vendor -> internal (Stock Reception)
  DELIVERY = "delivery", // internal -> customer
  INTERNAL = "internal", // internal -> internal (Internal Transfer)
  RETURN = "return", // reversal of a receipt or delivery
}

export enum PickingState {
  DRAFT = "draft",
  CONFIRMED = "confirmed",
  DONE = "done",
  CANCELLED = "cancelled",
}

