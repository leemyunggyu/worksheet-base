import { User } from '@things-factory/auth-base'
import { Bizplace } from '@things-factory/biz-base'
import {
  ArrivalNotice,
  OrderInventory,
  OrderNoGenerator,
  OrderProduct,
  OrderVas,
  ORDER_PRODUCT_STATUS,
  ORDER_STATUS,
  ORDER_TYPES,
  ORDER_VAS_STATUS,
  Vas,
  VAS_TARGET_TYPES
} from '@things-factory/sales-base'
import { Domain } from '@things-factory/shell'
import { Inventory, INVENTORY_STATUS, Location } from '@things-factory/warehouse-base'
import { Equal, Not } from 'typeorm'
import { WORKSHEET_STATUS, WORKSHEET_TYPE } from '../constants'
import { Worksheet, WorksheetDetail } from '../entities'
import { WorksheetNoGenerator } from '../utils'
import { GenerateVasInterface, VasWorksheetController } from './vas-worksheet-controller'
import { BasicInterface } from './worksheet-controller'

export interface GenerateUnloadingInterface extends BasicInterface {
  arrivalNoticeNo: string
  bufferLocationId: string
}

export interface GeneratePutawayInterface extends BasicInterface {
  arrivalNoticeNo: string
  inventories: Inventory[]
}

export type UnloadingWorksheetDetail = Partial<WorksheetDetail> & {
  palletizingVasId: string
  palletQty: number
  palletizingDescription: string
}
export interface ActivateUnloadingInterface extends BasicInterface {
  worksheetNo: string
  /**
   * @summary Worksheet detail list with changed pallet qty
   * @description When customer request loosen product for unloading
   * warehouse manager should change pallet qty before activate unloading worksheet
   */
  unloadingWorksheetDetails: UnloadingWorksheetDetail[]
}

export interface ActivatePutawayInterface extends BasicInterface {
  worksheetNo: string
  putawayWorksheetDetails: Partial<WorksheetDetail>[]
}

export class InboundWorksheetController extends VasWorksheetController {
  /**
   * @summary Generate Unloading Worksheet
   * @description
   * Create unloading worksheet
   *  - status: DEACTIVATED
   *
   * Create unloading worksheet details
   *  - status: DEACTIVATED
   *
   * Update status of orderProducts
   *  - status: ARRIVED => READY_TO_UNLOAD
   *
   * Call generateVasWorksheet function if it's needed
   *
   * Update status of arrival notice
   *  - status: ARRIVED => READY_TO_UNLOAD
   * @param {GenerateUnloadingInterface} worksheetInterface
   * @returns {Promise<Worksheet>}
   */
  async generateUnloadingWorksheet(worksheetInterface: GenerateUnloadingInterface): Promise<Worksheet> {
    const domain: Domain = worksheetInterface.domain
    const user: User = worksheetInterface.user
    let arrivalNotice: ArrivalNotice = await this.findRefOrder(
      ArrivalNotice,
      {
        domain,
        name: worksheetInterface.arrivalNoticeNo,
        status: ORDER_STATUS.ARRIVED
      },
      ['bizplace', 'orderProducts', 'orderVass']
    )
    const bizplace: Bizplace = arrivalNotice.bizplace
    const orderProducts: OrderProduct[] = arrivalNotice.orderProducts
    const orderVASs: OrderVas[] = arrivalNotice.orderVass

    const bufferLocationId: string = worksheetInterface.bufferLocationId
    const bufferLocation: Location = await this.trxMgr.getRepository(Location).findOne(bufferLocationId)

    const worksheet: Worksheet = await this.createWorksheet(
      domain,
      bizplace,
      arrivalNotice,
      WORKSHEET_TYPE.UNLOADING,
      user,
      bufferLocation
    )

    const worksheetDetails: Partial<WorksheetDetail>[] = orderProducts.map((targetProduct: OrderProduct) => {
      return {
        domain,
        bizplace,
        worksheet,
        name: WorksheetNoGenerator.unloadingDetail(),
        type: WORKSHEET_TYPE.UNLOADING,
        targetProduct,
        status: WORKSHEET_STATUS.DEACTIVATED,
        creator: user,
        updater: user
      } as Partial<WorksheetDetail>
    })
    await this.createWorksheetDetails(worksheetDetails)

    orderProducts.forEach((ordProd: OrderProduct) => {
      ordProd.status = ORDER_PRODUCT_STATUS.READY_TO_UNLOAD
      ordProd.updater = user
    })
    await this.updateOrderTargets(OrderProduct, orderProducts)

    if (orderVASs?.length > 0) {
      await this.generateVasWorksheet({
        domain,
        user,
        referenceOrder: arrivalNotice
      } as GenerateVasInterface)
    }

    arrivalNotice.status = ORDER_STATUS.READY_TO_UNLOAD
    arrivalNotice.updater = user
    await this.updateRefOrder(ArrivalNotice, arrivalNotice)

    return worksheet
  }

  /**
   * @summary Generate Putaway Worksheet
   * @description
   * Find unloading worksheet to find current buffer location
   *
   * Check whether putaway worksheet is exist
   *  Case 1: Exists - Putaway worksheet have been created by manually for partial unloading
   *    Find putaway worksheet
   *  Case 2: Not exists - There wasn't partial unloading
   *    Create putaway worksheet
   *    - status: DEACTIVATED
   *
   * Update inventories
   *  - status: UNLOADED or PARTIALLY_UNLOADED => PUTTING_AWAY
   *
   * Create order inventories
   *  If putaway worksheet have been created which means there was partial unloading,
   *  Status of order inventories should be PUTTING_AWAY.
   *  If not it should be UNLOADED
   *  - status: PUTTING_AWAY / UNLOADED
   *
   * Create putaway worksheet details
   *  If putaway worksheet have been created which means there was partial unloading,
   *  Status of worksheet details should be EXECUTING.
   *  If not it should be DEACTIVATED
   *  - status: EXECUTING / DEACTIVATED
   *
   * @param {GeneratePutawayInterface} worksheetInterface
   * @returns {Promise<Worksheet>}
   */
  async generatePutawayWorksheet(worksheetInterface: GeneratePutawayInterface): Promise<Worksheet> {
    const domain: Domain = worksheetInterface.domain
    const user: User = worksheetInterface.user
    let arrivalNotice: ArrivalNotice = await this.findRefOrder(
      ArrivalNotice,
      {
        domain,
        name: worksheetInterface.arrivalNoticeNo,
        status: ORDER_STATUS.ARRIVED
      },
      ['bizplace']
    )

    const bizplace: Bizplace = arrivalNotice.bizplace
    const unloadingWorksheet: Worksheet = await this.findWorksheetByRefOrder(
      domain,
      arrivalNotice,
      WORKSHEET_TYPE.UNLOADING,
      ['bufferLocation']
    )
    const bufferLocation: Location = unloadingWorksheet.bufferLocation

    // Check whether putaway worksheet is exists or not
    let putawayWorksheet: Worksheet = await this.trxMgr.getRepository(Worksheet).findOne({
      domain,
      bizplace,
      arrivalNotice,
      type: WORKSHEET_TYPE.PUTAWAY
    })

    let oiStatus: string = ORDER_PRODUCT_STATUS.UNLOADED // Default status of order inventories is UNLOADED
    let wsdStatus: string = WORKSHEET_STATUS.DEACTIVATED // Default status of worksheet is DEACTIVATED
    if (!putawayWorksheet) {
      // If it's not exists create new putaway worksheet
      putawayWorksheet = await this.createWorksheet(
        domain,
        bizplace,
        arrivalNotice,
        WORKSHEET_TYPE.PUTAWAY,
        user,
        bufferLocation
      )
    } else {
      // If there is putaway worksheet. It means unloading is completed partially.
      // So status of newly created worksheet details and order inventories should be changed to
      // Executing situation.
      oiStatus = ORDER_PRODUCT_STATUS.PUTTING_AWAY // Default status = PUTTING_AWAY
      wsdStatus = WORKSHEET_STATUS.EXECUTING // Default status = EXECUTING
    }

    let inventories: Inventory[] = worksheetInterface.inventories
    if (inventories.some((inv: Inventory) => !(inv instanceof Inventory))) {
      inventories = await this.trxMgr.getRepository(Inventory).findByIds(inventories.map((inv: Inventory) => inv.id))
    }

    for (let inventory of inventories) {
      inventory.status = INVENTORY_STATUS.PUTTING_AWAY
      inventory.updater = user
      inventory = await this.trxMgr.getRepository(Inventory).save(inventory)

      let targetInventory: OrderInventory = {
        domain,
        bizplace,
        name: OrderNoGenerator.orderInventory(),
        status: oiStatus,
        type: ORDER_TYPES.ARRIVAL_NOTICE,
        arrivalNotice,
        inventory,
        creator: user,
        updater: user
      }
      targetInventory = await this.trxMgr.getRepository(OrderInventory).save(targetInventory)

      const worksheetDetail: Partial<WorksheetDetail> = {
        domain,
        bizplace,
        name: WorksheetNoGenerator.generate(WORKSHEET_TYPE.PUTAWAY, true),
        worksheet: putawayWorksheet,
        targetInventory,
        fromLocation: bufferLocation,
        status: wsdStatus,
        creator: user,
        updater: user
      }
      await this.createWorksheetDetails([worksheetDetail])
    }

    return putawayWorksheet
  }

  /**
   * @summary Activate Unloading Worksheet
   * @description
   * Activate unloading worksheet
   * If there's palletizing order products (this case can be happened when customer
   * request GAN with loosen products) Palletizing VAS will be generated automatically.
   *
   *
   * Update order products
   *  - status: DEACTIVATED => UNLOADING
   *  - palletQty:
   *      palletized product case: n => n
   *      loosen product case: null => n
   *
   * If there's loosen product create palletizing worksheet details
   *
   * Update arrival notice
   *  - status: READY_TO_UNLOAD => PROCESSING
   *
   * Update worksheet
   *  - status: DEACTIVATED => EXECUTING
   *
   * Update worksheet details
   *  - status: DEACTIVATED => EXECUTING
   *  - description?: description (if warehouse manager key in something to describe about task)
   *
   * @param {ActivateUnloadingInterface} worksheetInterface
   * @returns {Promise<Worksheet>}
   */
  async activateUnloading(worksheetInterface: ActivateUnloadingInterface): Promise<Worksheet> {
    const domain: Domain = worksheetInterface.domain
    const user: User = worksheetInterface.user

    let worksheet: Worksheet = await this.findWorksheetByNo(domain, worksheetInterface.worksheetNo, [
      'bizplace',
      'arrivalNotice',
      'worksheetDetails',
      'worksheetDetails.targetProduct',
      'worksheetDetails.targetProduct.product'
    ])

    const bizplace: Bizplace = worksheet.bizplace
    const unloadingWSDs: UnloadingWorksheetDetail[] = worksheetInterface.unloadingWorksheetDetails
    let worksheetDetails: WorksheetDetail[] = worksheet.worksheetDetails

    const targetProducts: OrderProduct[] = worksheetDetails.map((wsd: WorksheetDetail) => {
      let targetProduct: OrderProduct = wsd.targetProduct

      if (!targetProduct.palletQty) {
        const { palletQty }: { palletQty: number } = this.findMatchedWSD(wsd.name, unloadingWSDs)
        targetProduct.palletQty = palletQty
      }
      targetProduct.status = ORDER_PRODUCT_STATUS.UNLOADING
      targetProduct.updater = user

      return targetProduct
    })
    await this.updateOrderTargets(OrderProduct, targetProducts)

    let arrivalNotice: ArrivalNotice = worksheet.arrivalNotice
    arrivalNotice.status = ORDER_STATUS.PROCESSING
    arrivalNotice.updater = user
    this.updateRefOrder(ArrivalNotice, arrivalNotice)

    const palletizingWSDs: UnloadingWorksheetDetail[] = this.filterPalletizingWSDs(unloadingWSDs)
    if (palletizingWSDs.length > 0) {
      this.createPalletizingWSDs(domain, bizplace, user, arrivalNotice, worksheetDetails, unloadingWSDs)
    }

    return this.activateWorksheet(worksheet, worksheetDetails, unloadingWSDs, user)
  }

  /**
   * @summary Activate Putaway Worksheet
   * @description
   * Activate putaway worksheet
   * If there's non finished VAS order putaway can't be activated
   *
   * Update order inventories
   *  - status: READY_TO_PUTAWAY => PUTTING_AWAY
   *
   * Update worksheet
   *  - status: DEACTIVATED => EXECUTING
   *
   * Update worksheet details
   *  - status: DEACTIVATED => EXECUTING
   *  - description?: description (if warehouse manager key in something to describe about task)
   *
   * @param {ActivatePutawayInterface} worksheetInterface
   * @returns {Promise<Worksheet>}
   */
  async activatePutaway(worksheetInterface: ActivatePutawayInterface): Promise<Worksheet> {
    const domain: Domain = worksheetInterface.domain
    const user: User = worksheetInterface.user

    let worksheet: Worksheet = await this.findWorksheetByNo(domain, worksheetInterface.worksheetNo, [
      'arrivalNotice',
      'worksheetDetails',
      'worksheetDetails.targetInventory'
    ])

    const arrivalNotice: ArrivalNotice = worksheet.arrivalNotice
    const nonFinishedVasCnt: number = await this.trxMgr.getRepository(Worksheet).count({
      where: {
        domain,
        arrivalNotice,
        type: WORKSHEET_TYPE.VAS,
        status: Not(Equal(WORKSHEET_STATUS.DONE))
      }
    })
    if (nonFinishedVasCnt) return

    const putawayWSDs: Partial<WorksheetDetail>[] = worksheetInterface.putawayWorksheetDetails
    let worksheetDetails: WorksheetDetail[] = worksheet.worksheetDetails

    const targetInventories: OrderInventory[] = worksheetDetails.map((wsd: WorksheetDetail) => {
      let targetInventory: OrderInventory = wsd.targetInventory
      targetInventory.status = ORDER_PRODUCT_STATUS.PUTTING_AWAY
      targetInventory.updater = user
      return targetInventory
    })
    await this.updateOrderTargets(OrderInventory, targetInventories)

    return this.activateWorksheet(worksheet, worksheetDetails, putawayWSDs, user)
  }

  async createPalletizingWSDs(
    domain: Domain,
    bizplace: Bizplace,
    user: User,
    arrivalNotice: ArrivalNotice,
    worksheetDetails: WorksheetDetail[],
    palletizingWSDs: UnloadingWorksheetDetail[]
  ): Promise<void> {
    let palletizingOrderVASs: Partial<OrderVas>[] = []

    for (let palletizingWSD of palletizingWSDs) {
      const palletizingVAS: Vas = await this.trxMgr.getRepository(Vas).findOne({
        where: { domain, id: palletizingWSD.palletizingVasId }
      })

      const targetProduct: OrderProduct = worksheetDetails.find(
        (wsd: WorksheetDetail) => wsd.name === palletizingWSD.name
      )

      palletizingOrderVASs.push({
        domain,
        bizplace,
        name: OrderNoGenerator.orderVas(),
        arrivalNotice,
        vas: palletizingVAS,
        targetType: VAS_TARGET_TYPES.BATCH_AND_PRODUCT_TYPE,
        targetBatchId: targetProduct.batchId,
        targetProduct: targetProduct.product,
        packingType: targetProduct.packingType,
        description: palletizingWSD.palletizingDescription,
        type: ORDER_TYPES.ARRIVAL_NOTICE,
        status: ORDER_VAS_STATUS.COMPLETED,
        creator: user,
        updater: user
      })
    }

    this.trxMgr.getRepository(OrderVas).save(palletizingOrderVASs)

    let vasWorksheet: Worksheet = await this.findWorksheetByRefOrder(domain, arrivalNotice, WORKSHEET_TYPE.VAS)
    if (!vasWorksheet) {
      this.generateVasWorksheet({
        domain,
        user,
        referenceOrder: arrivalNotice
      })
    } else {
      const newPalletizingWSDs: Partial<WorksheetDetail>[] = palletizingOrderVASs.map((targetVas: OrderVas) => {
        return {
          domain,
          bizplace,
          worksheet: vasWorksheet,
          name: WorksheetNoGenerator.generate(WORKSHEET_TYPE.VAS, true),
          targetVas,
          type: WORKSHEET_TYPE.VAS,
          status: WORKSHEET_STATUS.DONE,
          creator: user,
          updater: user
        }
      })
      await this.createWorksheetDetails(newPalletizingWSDs)
    }
  }

  filterPalletizingWSDs(unloadingWSDs: UnloadingWorksheetDetail[]): UnloadingWorksheetDetail[] {
    return unloadingWSDs.filter((wsd: UnloadingWorksheetDetail) => wsd.palletQty && wsd.palletizingDescription)
  }
}
