export enum SalesOrderType {
  ADHOC = 'adhoc',
  NORMAL = 'normal',
  ARC = 'arc',
  OPEN_ORDER = 'open_order',
  SCHEDULED = 'scheduled',
}

export enum SalesOrderState {
  DRAFT = 'draft',
  SENT = 'sent',
  SENT_FOR_APPROVAL = 'sent_for_approval',
  APPROVED = 'approved',
  SALE = 'sale',
  DONE = 'done',
  CANCEL = 'cancel',
}
