import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

export enum PaymentTermLineValueType {
  PERCENT = 'percent', // percentage of total
  FIXED = 'fixed', // fixed amount
  BALANCE = 'balance', // remaining balance (usually the last line)
}

@Entity('payment_terms')
export class PaymentTerm extends BaseEntity {
  @Column()
  name: string; // e.g. "Immediate Payment", "30 Days", "50% Advance, 50% on Delivery"

  @Column({ nullable: true })
  note: string;

  @OneToMany(() => PaymentTermLine, (line) => line.paymentTerm, {
    cascade: true,
    eager: true,
  })
  lines: PaymentTermLine[];
}

@Entity('payment_term_lines')
export class PaymentTermLine extends BaseEntity {
  @ManyToOne(() => PaymentTerm, (term) => term.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_term_id' })
  paymentTerm: PaymentTerm;

  @Column({ name: 'payment_term_id' })
  paymentTermId: string;

  @Column({ default: 10 })
  sequence: number;

  @Column({
    type: 'enum',
    enum: PaymentTermLineValueType,
    default: PaymentTermLineValueType.BALANCE,
  })
  valueType: PaymentTermLineValueType;

  /** Percentage (0-100) or fixed amount, depending on valueType. Ignored for BALANCE. */
  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  value: number;

  /** Number of days after invoice date (or end of month) this installment is due. */
  @Column({ default: 0 })
  daysDue: number;

  /** If true, due date is pushed to the end of the month before adding daysDue. */
  @Column({ default: false, name: 'end_of_month' })
  endOfMonth: boolean;
}
