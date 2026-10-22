import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string; // e.g. admin, sales_manager, purchase_manager, inventory_manager, accountant

  @Column({ nullable: true })
  description: string;

  /**
   * Simple permission strings, e.g. ["products:read","products:write","users:manage"]
   * Kept flexible (array) instead of a rigid ACL table for simplicity.
   */
  @Column('simple-array', { nullable: true })
  permissions: string[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
