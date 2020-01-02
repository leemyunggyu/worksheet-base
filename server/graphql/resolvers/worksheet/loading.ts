import {
  generateDeliveryOrder,
  OrderInventory,
  OrderNoGenerator,
  ORDER_INVENTORY_STATUS,
  ORDER_STATUS,
  ReleaseGood
} from '@things-factory/sales-base'
import { getManager, In } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../constants'
import { Worksheet, WorksheetDetail } from '../../../entities'

export const loading = {
  async loading(_: any, { loadedWorksheetDetails, releaseGoodNo, transportDriver, transportVehicle }, context: any) {
    return await getManager().transaction(async trxMgr => {
      const releaseGood: ReleaseGood = await trxMgr.getRepository(ReleaseGood).findOne({
        where: { domain: context.state.domain, name: releaseGoodNo, status: ORDER_STATUS.LOADING },
        relations: ['bizplace']
      })

      const wsdNames: string[] = loadedWorksheetDetails.map((wsd: any) => wsd.name)
      const worksheetDetails: WorksheetDetail[] = await trxMgr.getRepository(WorksheetDetail).find({
        where: {
          domain: context.state.domain,
          name: In(wsdNames),
          status: WORKSHEET_STATUS.EXECUTING,
          type: WORKSHEET_TYPE.LOADING
        },
        relations: [
          'worksheet',
          'worksheet.worksheetDetails',
          'targetInventory',
          'targetInventory.bizplace',
          'targetInventory.inventory',
          'targetInventory.releaseGood'
        ]
      })
      const pickedInventories: any[] = worksheetDetails.map((wsd: WorksheetDetail) => {
        return {
          worksheetDetailName: wsd.name,
          orderInventory: wsd.targetInventory
        }
      })

      for (let i = 0; i < pickedInventories.length; i++) {
        const pickedInv = pickedInventories[i]
        // Compare loaded qty with picked qty
        const orderInventory: OrderInventory = pickedInv.orderInventory
        const pickedQty: number = orderInventory.releaseQty
        const loadedQty: number = loadedWorksheetDetails.find(
          (loadedWSD: any) => loadedWSD.name === pickedInv.worksheetDetailName
        ).loadedQty

        // loadedQty > pickedQty => Error
        if (loadedQty > pickedQty) {
          throw new Error(`Loaded QTY can't exceed Picked QTY`)
        } else if (loadedQty == pickedQty) {
          // loadedQty == pickedQty
          // 1. Change status of current worksheet detail
          // 2. Change status of order inventory
          // 3. Create inventory history
          const targetWSD: WorksheetDetail = worksheetDetails.find(
            (wsd: WorksheetDetail) => wsd.name === pickedInv.worksheetDetailName
          )

          await trxMgr.getRepository(WorksheetDetail).save({
            ...targetWSD,
            status: WORKSHEET_STATUS.DONE,
            updater: context.state.user
          })

          await trxMgr.getRepository(OrderInventory).save({
            ...orderInventory,
            status: ORDER_INVENTORY_STATUS.LOADED,
            updater: context.state.user
          })
        } else if (loadedQty < pickedQty) {
          // loadedQty < picked
          // 1. Create new order inventory which has LOADED as status and qty same as loadedQty
          // 2. Calculate remain qty of original order inventory and update the record
          const worksheet: Worksheet = await trxMgr.getRepository(Worksheet).findOne({
            where: { releaseGood, type: WORKSHEET_TYPE.LOADING },
            relations: ['worksheetDetails']
          })
          const seq: number = worksheet.worksheetDetails.length
          const loadedOrderInventory: OrderInventory = {
            ...orderInventory,
            name: OrderNoGenerator.orderInventory(),
            status: ORDER_INVENTORY_STATUS.LOADED,
            releaseQty: loadedQty,
            seq,
            creator: context.state.user,
            updater: context.state.user
          }
          delete loadedOrderInventory.id

          await trxMgr.getRepository(OrderInventory).save(loadedOrderInventory)
          await trxMgr.getRepository(OrderInventory).save({
            ...orderInventory,
            releaseQty: pickedQty - loadedQty,
            updater: context.state.user
          })
        }
      }

      const targetInventories: OrderInventory[] = worksheetDetails.map((wsd: WorksheetDetail) => wsd.targetInventory)

      await generateDeliveryOrder(
        transportDriver,
        transportVehicle,
        targetInventories,
        releaseGood.bizplace,
        releaseGood,
        context.state.domain,
        context.state.user,
        trxMgr
      )

      return {
        releaseGoodNo,
        transportDriver,
        transportVehicle
      }
    })
  }
}
