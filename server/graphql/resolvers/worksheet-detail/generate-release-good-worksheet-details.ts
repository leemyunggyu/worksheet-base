import { OrderInventory, OrderNoGenerator, ORDER_INVENTORY_STATUS } from '@things-factory/sales-base'
import { EntityManager, getManager } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../constants'
import { Worksheet, WorksheetDetail } from '../../../entities'
import { WorksheetNoGenerator } from '../../../utils'
import { Inventory } from '@things-factory/warehouse-base'

export const generateReleaseGoodWorksheetDetailsResolver = {
  async generateReleaseGoodWorksheetDetails(
    _: any,
    { worksheetNo, batchId, productName, packingType, worksheetDetails },
    context: any
  ): Promise<void> {
    return await getManager().transaction(async (trxMgr: EntityManager) => {
      // 1. Remove prev worksheet details if it's exists
      const worksheet: Worksheet = await trxMgr.getRepository(Worksheet).findOne({
        where: { name: worksheetNo, domain: context.state.domain },
        relations: ['bizplace', 'releaseGood', 'worksheetDetails', 'worksheetDetails.targetInventory'],
      })

      const prevWSDs: WorksheetDetail[] = worksheet.worksheetDetails.filter((wsd: WorksheetDetail) => {
        const targetInv: OrderInventory = wsd.targetInventory
        if (
          targetInv.batchId === batchId &&
          targetInv.productName === productName &&
          targetInv.packingType === packingType
        )
          return wsd.id
      })

      // TODO: Delete order inventories
      if (prevWSDs?.length) {
        const wsdIds: string[] = prevWSDs.map((wsd: WorksheetDetail) => wsd.id)
        const prevOrderInvIds: string[] = prevWSDs.map((wsd: WorksheetDetail) => wsd.targetInventory.id)
        await trxMgr.getRepository(WorksheetDetail).delete(wsdIds)
        await trxMgr.getRepository(OrderInventory).delete(prevOrderInvIds)
      }

      await Promise.all(
        worksheetDetails.map(async (wsd: WorksheetDetail) => {
          // 2. Create order inventory
          let targetInventory: OrderInventory = wsd.targetInventory
          const inventory: Inventory = await trxMgr.getRepository(Inventory).findOne(targetInventory.inventory.id)

          targetInventory = await trxMgr.getRepository(OrderInventory).save({
            ...targetInventory,
            domain: context.state.domain,
            bizplace: worksheet.bizplace,
            name: OrderNoGenerator.orderInventory(),
            releaseGood: worksheet.releaseGood,
            inventory,
            batchId,
            status: ORDER_INVENTORY_STATUS.READY_TO_PICK,
            productName,
            packingType,
            creator: context.state.user,
            updater: context.state.user,
          })

          await trxMgr.getRepository(Inventory).save({
            ...targetInventory.inventory,
            lockedQty: targetInventory.releaseQty,
            lockedWeight: targetInventory.releaseWeight,
            updater: context.state.user,
          })

          // 3. Create worksheet details
          await trxMgr.getRepository(WorksheetDetail).save({
            ...wsd,
            domain: context.state.domain,
            bizplace: worksheet.bizplace,
            worksheet,
            name: WorksheetNoGenerator.pickingDetail(),
            targetInventory,
            type: WORKSHEET_TYPE.PICKING,
            status: WORKSHEET_STATUS.DEACTIVATED,
            creator: context.state.user,
            updater: context.state.user,
          })
        })
      )
    })
  },
}
