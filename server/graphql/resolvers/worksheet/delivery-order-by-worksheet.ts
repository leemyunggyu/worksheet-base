import { Bizplace, ContactPoint } from '@things-factory/biz-base'
import { DeliveryOrder } from '@things-factory/sales-base'
import { getRepository } from 'typeorm'

export const deliveryOrderByWorksheetResolver = {
  async deliveryOrderByWorksheet(_: any, { name }, context: any) {
    const foundDO: DeliveryOrder = await getRepository(DeliveryOrder).findOne({
      where: {
        domain: context.state.domain,
        name
      },
      relations: ['domain', 'bizplace', 'transportDriver', 'transportVehicle', 'releaseGood', 'creator', 'updater']
    })

    const partnerBiz: Bizplace = await getRepository(Bizplace).findOne({
      where: { id: foundDO.bizplace.id }
    })

    const partnerContactPoint: ContactPoint[] = await getRepository(ContactPoint).find({
      where: { domain: context.state.domain, bizplace: partnerBiz }
    })

    return {
      deliveryOrderInfo: {
        ownCollection: foundDO.ownCollection,
        doStatus: foundDO.status
      },
      contactPointInfo: partnerContactPoint.map(async (cp: ContactPoint) => {
        return {
          address: cp.address || '',
          email: cp.email || '',
          fax: cp.fax || '',
          phone: cp.phone || '',
          contactName: cp.name || ''
        }
      })
    }
  }
}
