import { Bizplace } from '@things-factory/biz-base'
import { ArrivalNotice } from '@things-factory/sales-base'
import { Inventory, InventoryHistory } from '@things-factory/warehouse-base'
import { InventoryNoGenerator } from 'server/utils/inventory-no-generator'
import { getManager, getRepository } from 'typeorm'
import { Worksheet, WorksheetDetail } from '../../../entities'
import { INVENTORY_STATUS, ORDER_STATUS, WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../enum'

export const completePutaway = {
  async completePutaway(_: any, { arrivalNoticeNo }, context: any) {
    return await getManager().transaction(async () => {
      /**
       * 1. Validation for worksheet
       *    - data existing
       */
      const arrivalNotice: ArrivalNotice = await getRepository(ArrivalNotice).findOne({
        where: { domain: context.state.domain, name: arrivalNoticeNo, status: ORDER_STATUS.PROCESSING },
        relations: ['bizplace']
      })

      if (!arrivalNotice) throw new Error(`ArrivalNotice doesn't exists.`)
      const customerBizplace: Bizplace = arrivalNotice.bizplace

      const foundPutawayWorksheet: Worksheet = await getRepository(Worksheet).findOne({
        where: {
          domain: context.state.domain,
          bizplace: customerBizplace,
          status: WORKSHEET_STATUS.EXECUTING,
          type: WORKSHEET_TYPE.PUTAWAY,
          arrivalNotice
        },
        relations: [
          'worksheetDetails',
          'worksheetDetails.targetInventory',
          'worksheetDetails.targetInventory.product',
          'worksheetDetails.targetInventory.warehouse',
          'worksheetDetails.targetInventory.location'
        ]
      })

      if (!foundPutawayWorksheet) throw new Error(`Worksheet doesn't exists.`)

      // 2. update status of work sheet
      await getRepository(Worksheet).save({
        ...foundPutawayWorksheet,
        status: WORKSHEET_STATUS.DONE,
        endedAt: Date.now(),
        updater: context.state.user
      })

      // 3. insert inventory history table
      const worksheetDetails: WorksheetDetail[] = foundPutawayWorksheet.worksheetDetails

      await getRepository(InventoryHistory).insert(
        worksheetDetails.map((worksheetDetail: WorksheetDetail) => {
          const inventory: Inventory = worksheetDetail.targetInventory

          return {
            domain: context.state.domain,
            bizplace: customerBizplace,
            seq: inventory.lastSeq++,
            name: InventoryNoGenerator.inventoryHistoryName(),
            palletId: inventory.palletId,
            batchId: inventory.batchId,
            productId: inventory.product.id,
            warehouseId: inventory.warehouse.id,
            locationId: inventory.location.id,
            zone: inventory.zone,
            packingType: inventory.packingType,
            qty: inventory.qty,
            status: INVENTORY_STATUS.OCCUPIED,
            creator: context.state.user,
            updater: context.state.user
          }
        })
      )
    })
  }
}
