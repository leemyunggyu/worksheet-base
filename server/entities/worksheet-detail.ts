import { User } from '@things-factory/auth-base'
import { Bizplace, Worker } from '@things-factory/biz-base'
import { OrderInventory, OrderProduct, OrderVas } from '@things-factory/sales-base'
import { Domain } from '@things-factory/shell'
import { Location } from '@things-factory/warehouse-base'
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Worksheet } from './worksheet'

@Entity()
@Index(
  'ix_worksheet-detail_0',
  (worksheetDetail: WorksheetDetail) => [worksheetDetail.domain, worksheetDetail.bizplace, worksheetDetail.name],
  { unique: true }
)
export class WorksheetDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(type => Domain)
  domain: Domain

  @ManyToOne(type => Bizplace)
  bizplace: Bizplace

  @Column()
  name: string

  @Column({
    nullable: true
  })
  description: string

  /**
   * @description Sequance for VAS Order
   */
  @Column({
    nullable: true,
    type: 'smallint',
    default: 0
  })
  seq: number

  @Column()
  type: string

  @Column()
  status: string

  @ManyToOne(type => Worksheet, {
    nullable: false
  })
  worksheet: Worksheet

  @ManyToOne(type => Worker)
  worker: Worker

  @ManyToOne(type => OrderProduct)
  targetProduct: OrderProduct

  @ManyToOne(type => OrderVas)
  targetVas: OrderVas

  @ManyToOne(type => OrderInventory)
  targetInventory: OrderInventory

  @ManyToOne(type => Location)
  fromLocation: Location

  @ManyToOne(type => Location)
  toLocation: Location

  @Column({
    nullable: true
  })
  remark: string

  @Column({
    nullable: true
  })
  issue: string

  @ManyToOne(type => User, {
    nullable: true
  })
  creator: User

  @ManyToOne(type => User, {
    nullable: true
  })
  updater: User

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
