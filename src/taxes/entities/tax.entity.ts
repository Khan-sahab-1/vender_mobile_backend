import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

export enum TaxAmountType {
  PERCENT = 'percent', // % of price
  FIXED = 'fixed', // fixed amount per unit
  GROUP = 'group', // group of sub-taxes (simplified: not expanded here)
}

export enum TaxTypeUse {
  SALE = 'sale',
  PURCHASE = 'purchase',
  NONE = 'none',
}

@Entity('taxes')
export class Tax extends BaseEntity {
  @Column()
  name: string; // e.g. "GST 18%", "VAT 5%"

  @Column({ nullable: true })
  code: string;

  @Column({ type: 'enum', enum: TaxAmountType, default: TaxAmountType.PERCENT })
  amountType: TaxAmountType;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  amount: number; // 18 for 18%, or fixed value

  @Column({ type: 'enum', enum: TaxTypeUse, default: TaxTypeUse.SALE })
  typeTaxUse: TaxTypeUse;

  @Column({ default: false, name: 'price_included' })
  priceIncluded: boolean; // tax-included pricing, like Odoo's price_include

  @Column({ default: 10 })
  sequence: number;

  @Column({ nullable: true })
  description: string;
}
