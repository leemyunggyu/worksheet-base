import { OrderInventory, ORDER_INVENTORY_STATUS } from '@things-factory/sales-base'
import {
  Inventory,
  InventoryHistory,
  InventoryNoGenerator,
  INVENTORY_STATUS,
  INVENTORY_TRANSACTION_TYPE,
  Location,
  LOCATION_STATUS
} from '@things-factory/warehouse-base'
import { getManager } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../constants'
import { Worksheet, WorksheetDetail } from '../../../entities'

export const returning = {
  async returning(_: any, { worksheetDetailName, palletId, toLocation }, context: any) {
    return await getManager().transaction(async trxMgr => {
      // 1. get worksheet detail
      const worksheetDetail: WorksheetDetail = await trxMgr.getRepository(WorksheetDetail).findOne({
        where: {
          domain: context.state.domain,
          name: worksheetDetailName,
          status: WORKSHEET_STATUS.EXECUTING,
          type: WORKSHEET_TYPE.RETURN
        },
        relations: ['worksheet', 'worksheet.releaseGood', 'targetInventory', 'targetInventory.inventory']
      })
      if (!worksheetDetail) throw new Error(`Worksheet Details doesn't exists`)
      const releaseGood = worksheetDetail.worksheet.releaseGood
      let targetInventory: OrderInventory = worksheetDetail.targetInventory
      let inventory: Inventory = targetInventory.inventory
      if (inventory.palletId !== palletId) throw new Error('Pallet ID is invalid')

      const worksheet: Worksheet = worksheetDetail.worksheet
      if (!worksheet) throw new Error(`Worksheet doesn't exists`)

      // 3. get to location object
      const location: Location = await trxMgr.getRepository(Location).findOne({
        where: { domain: context.state.domain, name: toLocation },
        relations: ['warehouse']
      })
      if (!location) throw new Error(`Location doesn't exists`)

      // 4. update location of inventory (current location => toLocation)
      inventory = await trxMgr.getRepository(Inventory).save({
        ...inventory,
        location,
        status: INVENTORY_STATUS.STORED,
        lastSeq: inventory.lastSeq + 1,
        warehouse: location.warehouse,
        zone: location.warehouse.zone,
        updater: context.state.user
      })

      // 4. 1) Update status of location
      if (location.status === LOCATION_STATUS.EMPTY) {
        await trxMgr.getRepository(Location).save({
          ...location,
          status: LOCATION_STATUS.OCCUPIED,
          updater: context.state.user
        })
      }

      // 5. add inventory history
      inventory = await trxMgr.getRepository(Inventory).findOne({
        where: { id: inventory.id },
        relations: ['bizplace', 'product', 'warehouse', 'location']
      })
      let inventoryHistory: InventoryHistory = {
        ...inventory,
        domain: context.state.domain,
        qty: 0,
        weight: 0,
        openingQty: inventory.qty,
        openingWeight: inventory.weight,
        name: InventoryNoGenerator.inventoryHistoryName(),
        seq: inventory.lastSeq,
        transactionType: INVENTORY_TRANSACTION_TYPE.RETURN,
        refOrderId: releaseGood.id,
        orderRefNo: releaseGood.refNo || null,
        orderNo: releaseGood.name,
        productId: inventory.product.id,
        warehouseId: inventory.warehouse.id,
        locationId: inventory.location.id,
        creator: context.state.user,
        updater: context.state.user
      }
      delete inventoryHistory.id
      await trxMgr.getRepository(InventoryHistory).save(inventoryHistory)

      // 6. update status of order inventory
      await trxMgr.getRepository(OrderInventory).save({
        ...targetInventory,
        status: ORDER_INVENTORY_STATUS.TERMINATED,
        updater: context.state.user
      })

      // 7. update status of worksheet details (EXECUTING => DONE)
      await trxMgr.getRepository(WorksheetDetail).save({
        ...worksheetDetail,
        status: WORKSHEET_STATUS.DONE,
        updater: context.state.user
      })
    })
  }
}