"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const utils_1 = require("../../utils");
const vas_worksheet_controller_1 = require("../vas/vas-worksheet-controller");
class PutawayWorksheetController extends vas_worksheet_controller_1.VasWorksheetController {
    async generatePutawayWorksheet(arrivalNoticeNo, inventories) {
        let arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, { domain: this.domain, name: arrivalNoticeNo }, ['bizplace']);
        const bizplace = arrivalNotice.bizplace;
        const unloadingWorksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.UNLOADING, [
            'bufferLocation'
        ]);
        const bufferLocation = unloadingWorksheet.bufferLocation;
        // Check whether putaway worksheet is exists or not
        let worksheet;
        try {
            worksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.PUTAWAY);
        }
        catch (e) { }
        let oiStatus = sales_base_1.ORDER_PRODUCT_STATUS.UNLOADED; // Default status of order inventories is UNLOADED
        let wsdStatus = constants_1.WORKSHEET_STATUS.DEACTIVATED; // Default status of worksheet is DEACTIVATED
        if (!worksheet) {
            // If it's not exists create new putaway worksheet
            worksheet = await this.createWorksheet(arrivalNotice, constants_1.WORKSHEET_TYPE.PUTAWAY, { bufferLocation });
        }
        else {
            // If there is putaway worksheet. It means unloading is completed partially.
            // So status of newly created worksheet details and order inventories should be changed to
            // Executing situation.
            oiStatus = sales_base_1.ORDER_PRODUCT_STATUS.PUTTING_AWAY; // Default status = PUTTING_AWAY
            wsdStatus = constants_1.WORKSHEET_STATUS.EXECUTING; // Default status = EXECUTING
        }
        if (inventories.some((inv) => !(inv instanceof warehouse_base_1.Inventory))) {
            inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findByIds(inventories.map((inv) => inv.id));
        }
        for (let inventory of inventories) {
            inventory.status = warehouse_base_1.INVENTORY_STATUS.PUTTING_AWAY;
            inventory.updater = this.user;
            inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventory);
            let targetInventory = new sales_base_1.OrderInventory();
            targetInventory.domain = this.domain;
            targetInventory.bizplace = bizplace;
            targetInventory.name = sales_base_1.OrderNoGenerator.orderInventory();
            targetInventory.status = oiStatus;
            targetInventory.type = sales_base_1.ORDER_TYPES.ARRIVAL_NOTICE;
            targetInventory.arrivalNotice = arrivalNotice;
            targetInventory.inventory = inventory;
            targetInventory.creator = this.user;
            targetInventory.updater = this.user;
            targetInventory = await this.trxMgr.getRepository(sales_base_1.OrderInventory).save(targetInventory);
            worksheet.worksheetDetails = await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.PUTAWAY, [targetInventory], { status: wsdStatus, fromLocation: bufferLocation });
        }
        return worksheet;
    }
    async activatePutaway(worksheetNo, putawayWorksheetDetails) {
        let worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.PUTAWAY, [
            'arrivalNotice',
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        let arrivalNotice = worksheet.arrivalNotice;
        const nonFinishedVasCnt = await this.trxMgr.getRepository(entities_1.Worksheet).count({
            where: {
                domain: this.domain,
                arrivalNotice,
                type: constants_1.WORKSHEET_TYPE.VAS,
                status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.DONE))
            }
        });
        if (nonFinishedVasCnt)
            return;
        const worksheetDetails = worksheet.worksheetDetails;
        const targetInventories = worksheetDetails.map((wsd) => {
            let targetInventory = wsd.targetInventory;
            targetInventory.status = sales_base_1.ORDER_PRODUCT_STATUS.PUTTING_AWAY;
            targetInventory.updater = this.user;
            return targetInventory;
        });
        await this.updateOrderTargets(targetInventories);
        arrivalNotice.status = sales_base_1.ORDER_STATUS.PUTTING_AWAY;
        arrivalNotice.updater = this.user;
        await this.updateRefOrder(arrivalNotice);
        return this.activateWorksheet(worksheet, worksheetDetails, putawayWorksheetDetails);
    }
    async completePutaway(arrivalNoticeNo) {
        // Because of partial unloading current status of arrivalNotice can be PUTTING_AWAY or PROCESSING
        // PUTTING_AWAY means unloading is completely finished.
        // PROCESSING means some products are still being unloaded.
        let arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, {
            name: arrivalNoticeNo,
            status: typeorm_1.In([sales_base_1.ORDER_STATUS.PUTTING_AWAY, sales_base_1.ORDER_STATUS.PROCESSING])
        });
        // Check whether unloading is done or not.
        const unloadingWorksheetCnt = await this.trxMgr.getRepository(entities_1.Worksheet).count({
            where: {
                domain: this.domain,
                arrivalNotice,
                type: constants_1.WORKSHEET_TYPE.UNLOADING,
                status: constants_1.WORKSHEET_STATUS.EXECUTING
            }
        });
        if (unloadingWorksheetCnt)
            throw new Error(`Unloading is not completed yet`);
        const putawayWorksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.PUTAWAY, [
            'bufferLocation'
        ]);
        await utils_1.switchLocationStatus(this.domain, putawayWorksheet.bufferLocation, this.user, this.trxMgr);
        return await this.completWorksheet(putawayWorksheet, sales_base_1.ORDER_STATUS.DONE);
    }
    async putaway(worksheetDetailName, palletId, locationName) {
        const reusablePallet = await this.trxMgr.getRepository(warehouse_base_1.Pallet).findOne({
            where: { domain: this.domain, name: palletId }
        });
        if (reusablePallet) {
            await this.putawayPallets(worksheetDetailName, reusablePallet, locationName);
        }
        else {
            await this.putawayPallet(worksheetDetailName, palletId, locationName);
        }
    }
    async putawayPallets(worksheetDetailName, reusablePallet, locationName) {
        const worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.PUTAWAY, [
            'worksheet',
            'worksheet.arrivalNotice',
            'worksheet.worksheetDetails',
            'worksheet.worksheetDetails.targetInventory',
            'worksheet.worksheetDetails.targetInventory.inventory'
        ]);
        const worksheet = worksheetDetail.worksheet;
        const arrivalNotice = worksheet.arrivalNotice;
        const worksheetDetails = worksheet.worksheetDetails;
        const inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).find({
            where: {
                domain: this.domain,
                reusablePallet,
                refOrderId: arrivalNotice.id,
                status: typeorm_1.In([warehouse_base_1.INVENTORY_STATUS.PUTTING_AWAY, warehouse_base_1.INVENTORY_STATUS.UNLOADED])
            }
        });
        for (let inventory of inventories) {
            const worksheetDetail = worksheetDetails.find((wsd) => wsd.targetInventory.inventory.name === inventory.name);
            let targetInventory = worksheetDetail.targetInventory;
            inventory = targetInventory.inventory;
            let location = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
                where: { domain: this.domain, name: locationName, type: typeorm_1.In([warehouse_base_1.LOCATION_TYPE.SHELF, warehouse_base_1.LOCATION_TYPE.BUFFER]) },
                relations: ['warehouse']
            });
            if (!location)
                throw new Error(this.ERROR_MSG.FIND.NO_RESULT(locationName));
            const warehouse = location.warehouse;
            const zone = location.zone;
            inventory.location = location;
            inventory.status = warehouse_base_1.INVENTORY_STATUS.STORED;
            inventory.warehouse = warehouse;
            inventory.zone = zone;
            await this.transactionInventory(inventory, arrivalNotice, 0, 0, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.PUTAWAY);
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
            targetInventory.updater = this.user;
            await this.updateOrderTargets([targetInventory]);
            worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
            worksheetDetail.updater = this.user;
            await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
        }
    }
    async putawayPallet(worksheetDetailName, palletId, locationName) {
        const worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.PUTAWAY, ['worksheet', 'worksheet.arrivalNotice', 'targetInventory', 'targetInventory.inventory']);
        const worksheet = worksheetDetail.worksheet;
        const arrivalNotice = worksheet.arrivalNotice;
        let targetInventory = worksheetDetail.targetInventory;
        let inventory = targetInventory.inventory;
        if (inventory.palletId !== palletId) {
            throw new Error(this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE('palletId', palletId, inventory.palletId));
        }
        const location = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
            where: { domain: this.domain, name: locationName, type: typeorm_1.In([warehouse_base_1.LOCATION_TYPE.SHELF, warehouse_base_1.LOCATION_TYPE.BUFFER]) },
            relations: ['warehouse']
        });
        if (!location)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(locationName));
        const warehouse = location.warehouse;
        const zone = warehouse.zone;
        inventory.location = location;
        inventory.status = warehouse_base_1.INVENTORY_STATUS.STORED;
        inventory.warehouse = warehouse;
        inventory.zone = zone;
        await this.transactionInventory(inventory, arrivalNotice, 0, 0, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.PUTAWAY);
        targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
        targetInventory.updater = this.user;
        await this.updateOrderTargets([targetInventory]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async undoPutaway(worksheetDetailName, palletId) {
        let worksheetDetail = await this.findWorksheetDetailByName(worksheetDetailName, [
            'worksheet',
            'worksheet.arrivalNotice',
            'targetInventory',
            'targetInventory.inventory',
            'fromLocation'
        ]);
        this.checkRecordValidity(worksheetDetail, { status: constants_1.WORKSHEET_STATUS.DONE });
        const worksheet = worksheetDetail.worksheet;
        const arrivalNotice = worksheet.arrivalNotice;
        const targetInventory = worksheetDetail.targetInventory;
        let inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findOne({
            where: { domain: this.domain, palletId }
        });
        await this.checkReleaseTarget(inventory);
        const bufferLocation = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
            where: { domain: this.domain, name: worksheetDetail.fromLocation.name }
        });
        inventory.location = bufferLocation;
        inventory.status = warehouse_base_1.INVENTORY_STATUS.UNLOADED;
        await this.transactionInventory(inventory, arrivalNotice, 0, 0, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.UNDO_PUTAWAY);
        targetInventory.status = sales_base_1.ORDER_PRODUCT_STATUS.PUTTING_AWAY;
        targetInventory.updater = this.user;
        await this.updateOrderTargets([targetInventory]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.EXECUTING;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async checkReleaseTarget(inventory) {
        const releaseTargetInventory = await this.trxMgr.getRepository(sales_base_1.OrderInventory).findOne({
            where: {
                domain: this.domain,
                type: sales_base_1.ORDER_TYPES.RELEASE_OF_GOODS,
                inventory
            }
        });
        if (releaseTargetInventory)
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('undo putaway', 'this pallet ID has been selected for releasing'));
    }
}
exports.PutawayWorksheetController = PutawayWorksheetController;
//# sourceMappingURL=putaway-worksheet-controller.js.map