import { SelectQueryBuilder, getRepository } from 'typeorm'
import { Worksheet, WorksheetDetail } from '../../../entities'

export const worksheetDetailsByProductGroupResolver = {
  async worksheetDetailsByProductGroup(_: any, { worksheetNo, batchId, productName, packingType }, context: any) {
    const worksheet: Worksheet = await getRepository(Worksheet).findOne({
      where: { domain: context.state.domain, name: worksheetNo },
      relations: ['bizplace', 'releaseGood']
    })
    if (!worksheet) throw new Error(`Couldn't find worksheet`)
    const bizplaceId: string = worksheet?.bizplace?.id
    if (!bizplaceId) throw new Error(`Couldn't find bizplace id`)

    const qb: SelectQueryBuilder<WorksheetDetail> = getRepository(WorksheetDetail).createQueryBuilder('WSD')
    const [items, total] = await qb
      .leftJoinAndSelect('WSD.targetInventory', 'ORD_INV')
      .leftJoinAndSelect('ORD_INV.inventory', 'INV')
      .leftJoinAndSelect('INV.location', 'LOC')
      .leftJoinAndSelect('INV.product', 'PROD')
      .andWhere('"WSD"."domain_id" = :domainId')
      .andWhere('"WSD"."bizplace_id" = :bizplaceId')
      .andWhere('"ORD_INV"."release_good_id" = :releaseGoodId')
      .andWhere('"ORD_INV"."batch_id" = :batchId')
      .andWhere('"PROD"."name" = :productName')
      .andWhere('"ORD_INV"."packing_type" = :packingType')
      .setParameters({
        domainId: context.state.domain.id,
        releaseGoodId: worksheet.releaseGood.id,
        bizplaceId,
        batchId,
        productName,
        packingType
      })
      .getManyAndCount()

    return {
      items,
      total
    }
  }
}
