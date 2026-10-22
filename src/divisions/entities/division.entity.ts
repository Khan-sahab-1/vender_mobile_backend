import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/base.entity";

@Entity("divisions")
export class Division extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;
}

