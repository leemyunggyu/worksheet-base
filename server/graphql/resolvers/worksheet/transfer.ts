import { Inventory, InventoryHistory, InventoryNoGenerator } from '@things-factory/warehouse-base'
import { getManager, getRepository } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../constants'
import { Worksheet, WorksheetDetail } from '../../../entities'

export const transfer = {
  async transfer(_: any, { palletId, toPalletId, qty }, context: any) {
    return await getManager().transaction(async () => {
      // 1. get to inventory
      let toInventory: Inventory = await getRepository(Inventory).findOne({
        where: { domain: context.state.domain, palletId: toPalletId },
        relations: ['bizplace', 'product', 'warehouse', 'location']
      })
      if (!toInventory) throw new Error(`to pallet doesn't exists`)

      // 2. get from inventory
      let fromInventory: Inventory = await getRepository(Inventory).findOne({
        where: { domain: context.state.domain, palletId },
        relations: ['bizplace', 'product', 'warehouse', 'location']
      })
      if (!fromInventory) throw new Error(`from pallet doesn't exists`)
      if (toInventory.batchId !== fromInventory.batchId) throw new Error(`Can't transfer to different batch`)

      // 3. get worksheet & worksheet detail
      const worksheetDetail: WorksheetDetail = await getRepository(WorksheetDetail).findOne({
        where: {
          domain: context.state.domain,
          targetInventory: fromInventory,
          status: WORKSHEET_STATUS.EXECUTING,
          type: WORKSHEET_TYPE.PUTAWAY
        },
        relations: ['worksheet']
      })
      if (!worksheetDetail) throw new Error(`Worksheet Detail doesn't exists`)
      const worksheet: Worksheet = worksheetDetail.worksheet
      if (!worksheet) throw new Error(`Worksheet doesn't exists`)

      // 4. transfer qty
      const result = fromInventory.qty - qty
      // 4. 1) if result < 0
      //    - throw error
      if (result < 0) {
        throw new Error(`Invalid qty, can't exceed limitation`)
      }
      // 4. 2) if result == 0
      else if (result == 0) {
        //    - plus qty to (toInventory)
        await getRepository(Inventory).save({
          ...toInventory,
          qty: toInventory.qty + qty,
          lastSeq: toInventory.lastSeq + 1,
          updater: context.state.user
        })
        //    - add inventory history
        delete toInventory.id
        await getRepository(InventoryHistory).save({
          ...toInventory,
          domain: context.state.domain,
          name: InventoryNoGenerator.inventoryHistoryName(),
          productId: toInventory.product.id,
          warehouseId: toInventory.warehouse.id,
          locationId: toInventory.location.id,
          seq: toInventory.lastSeq,
          creator: context.state.user,
          updater: context.state.user
        })
        //    - update (fromInventory)
        await getRepository(Inventory).save({
          ...fromInventory,
          qty: result,
          lastSeq: fromInventory.lastSeq + 1,
          updater: context.state.user
        })

        fromInventory = await getRepository(Inventory).findOne({
          where: { id: fromInventory.id },
          relations: ['bizplace', 'product', 'warehouse', 'location']
        })

        //    - add inventory history
        await getRepository(InventoryHistory).save({
          ...fromInventory,
          name: InventoryNoGenerator.inventoryHistoryName(),
          productId: fromInventory.product.id,
          warehouseId: fromInventory.warehouse.id,
          locationId: fromInventory.location.id,
          seq: fromInventory.lastSeq,
          creator: context.state.user,
          updater: context.state.user
        })
        //    - delete (fromInventory)
        await getRepository(Inventory).delete(fromInventory)
        //    - update worksheetDetail (EXECUTING => DONE)
        await getRepository(WorksheetDetail).save({
          ...worksheetDetail,
          status: WORKSHEET_STATUS.DONE,
          updater: context.state.user
        })
      }
      // 4. 3) if result > 0
      else if (result > 0) {
        await getRepository(Inventory).save({
          ...toInventory,
          qty: toInventory.qty + qty,
          lastSeq: toInventory.lastSeq + 1
        })

        toInventory = await getRepository(Inventory).findOne({
          where: { id: toInventory.id },
          relations: ['bizplace', 'product', 'warehouse', 'location']
        })
        //    - add inventory history
        delete toInventory.id
        await getRepository(InventoryHistory).save({
          ...toInventory,
          domain: context.state.domain,
          name: InventoryNoGenerator.inventoryHistoryName(),
          productId: toInventory.product.id,
          warehouseId: toInventory.warehouse.id,
          locationId: toInventory.location.id,
          seq: toInventory.lastSeq,
          creator: context.state.user,
          updater: context.state.user
        })

        await getRepository(Inventory).save({
          ...fromInventory,
          qty: result
        })
      }
    })
  }
}