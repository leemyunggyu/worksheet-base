import { Bizplace } from '@things-factory/biz-base'
import { OrderInventory, ORDER_INVENTORY_STATUS, ORDER_STATUS, ReleaseGood } from '@things-factory/sales-base'
import { Equal, getManager, Not } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../constants'
import { Worksheet, WorksheetDetail } from '../../../entities'

export const completePicking = {
  async completePicking(_: any, { releaseGoodNo }, context: any) {
    return await getManager().transaction(async trxMgr => {
      const releaseGood: ReleaseGood = await trxMgr.getRepository(ReleaseGood).findOne({
        where: { domain: context.state.domain, name: releaseGoodNo, status: ORDER_STATUS.PICKING },
        relations: ['bizplace']
      })

      if (!releaseGood) throw new Error(`Release Good doesn't exists.`)
      const customerBizplace: Bizplace = releaseGood.bizplace
      const foundPickingWorksheet: Worksheet = await trxMgr.getRepository(Worksheet).findOne({
        where: {
          domain: context.state.domain,
          bizplace: customerBizplace,
          status: WORKSHEET_STATUS.EXECUTING,
          type: WORKSHEET_TYPE.PICKING,
          releaseGood
        },
        relations: ['worksheetDetails', 'worksheetDetails.targetInventory']
      })

      if (!foundPickingWorksheet) throw new Error(`Worksheet doesn't exists.`)
      const worksheetDetails: WorksheetDetail[] = foundPickingWorksheet.worksheetDetails.map(
        (worksheetDetail: WorksheetDetail) => {
          return {
            ...worksheetDetail,
            status: WORKSHEET_STATUS.DONE,
            updater: context.state.user
          }
        }
      )
      await trxMgr.getRepository(WorksheetDetail).save(worksheetDetails)
      let targetInventories: OrderInventory[] = worksheetDetails.map(
        (worksheetDetail: WorksheetDetail) => worksheetDetail.targetInventory
      )
      targetInventories = targetInventories.map((targetInventory: OrderInventory) => {
        return {
          ...targetInventory,
          status: ORDER_INVENTORY_STATUS.TERMINATED,
          updater: context.state.user
        }
      })
      await trxMgr.getRepository(OrderInventory).save(targetInventories)

      // Update status and endtedAt of worksheet
      await trxMgr.getRepository(Worksheet).save({
        ...foundPickingWorksheet,
        status: WORKSHEET_STATUS.DONE,
        endedAt: new Date(),
        updater: context.state.user
      })

      // 2. If there's no more worksheet related with current release good, update status of release good
      // 2. 1) check wheter there are more worksheet or not
      const relatedWorksheetCnt: number = await trxMgr.getRepository(Worksheet).count({
        domain: context.state.domain,
        releaseGood,
        status: Not(Equal(WORKSHEET_STATUS.DONE))
      })

      if (relatedWorksheetCnt <= 0) {
        // if there no more related worksheet
        // 3. update status of release good
        await trxMgr.getRepository(ReleaseGood).save({
          ...releaseGood,
          status: ORDER_STATUS.DONE,
          updater: context.state.user
        })
      }
    })
  }
}
