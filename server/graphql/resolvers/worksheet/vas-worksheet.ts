import { ArrivalNotice, OrderVas } from '@things-factory/sales-base'
import { getRepository } from 'typeorm'
import { Worksheet, WorksheetDetail } from '../../../entities'
import { ORDER_STATUS, ORDER_TYPES, WORKSHEET_STATUS, WORKSHEET_TYPE } from '../../../enum'
import { Bizplace } from '@things-factory/biz-base'

export const vasWorksheetResolver = {
  async vasWorksheet(_: any, { orderNo, orderType }, context: any) {
    // 1. If it's worksheet which is related with arrival notice
    if (orderType === ORDER_TYPES.ARRIVAL_NOTICE) {
      const arrivalNotice: ArrivalNotice = await getRepository(ArrivalNotice).findOne({
        where: { domain: context.state.domain, name: orderNo, status: ORDER_STATUS.PROCESSING },
        relations: ['bizplace']
      })

      if (!arrivalNotice) throw new Error(`Arrival notice dosen't exist.`)
      const customerBizplace: Bizplace = arrivalNotice.bizplace

      const worksheet: Worksheet = await getRepository(Worksheet).findOne({
        where: {
          arrivalNotice,
          domain: context.state.domain,
          type: WORKSHEET_TYPE.VAS,
          status: WORKSHEET_STATUS.EXECUTING
        },
        relations: [
          'arrivalNotice',
          'worksheetDetails',
          'worksheetDetails.targetVas',
          'worksheetDetails.targetVas.vas',
          'creator',
          'updater'
        ]
      })

      return {
        worksheetInfo: {
          bizplaceName: customerBizplace,
          containerNo: arrivalNotice.containerNo,
          startedAt: worksheet.startedAt
        },
        worksheetDetailInfos: worksheet.worksheetDetails.map((vasWSD: WorksheetDetail) => {
          const targetVas: OrderVas = vasWSD.targetVas
          return {
            name: vasWSD.name,
            batchId: targetVas.batchId,
            targetName: targetVas.name,
            vas: targetVas.vas,
            description: vasWSD.description,
            remark: targetVas.remark,
            status: vasWSD.status
          }
        })
      }
    } else if (orderType === ORDER_TYPES.COLLECTION) {
    } else if (orderType === ORDER_TYPES.DELIVERY) {
    } else if (orderType === ORDER_TYPES.RELEASE_OF_GOODS) {
    } else if (orderType === ORDER_TYPES.SHIPPING) {
    }
  }
}
