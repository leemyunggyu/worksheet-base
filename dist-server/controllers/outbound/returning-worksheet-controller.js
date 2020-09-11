"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const vas_worksheet_controller_1 = require("../vas/vas-worksheet-controller");
class ReturningWorksheetController extends vas_worksheet_controller_1.VasWorksheetController {
    async generateReturningWorksheet(releaseGoodNo, targetInventories) {
        const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, { domain: this.domain, name: releaseGoodNo }, ['bizplace']);
        return await this.generateWorksheet(constants_1.WORKSHEET_TYPE.RETURN, releaseGood, targetInventories, sales_base_1.ORDER_STATUS.PARTIAL_RETURN, sales_base_1.ORDER_INVENTORY_STATUS.RETURNING);
    }
    async activateReturning(worksheetNo, returningWorksheetDetails) {
        const worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.RETURN, [
            'bizplace',
            'releaseGood',
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        const worksheetDetails = worksheet.worksheetDetails;
        const targetInventories = worksheetDetails.map((wsd) => {
            let targetInventory = wsd.targetInventory;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.RETURNING;
            targetInventory.updater = this.user;
        });
        await this.updateOrderTargets(targetInventories);
        return await this.activateWorksheet(worksheet, worksheetDetails, returningWorksheetDetails);
    }
    async returning(worksheetDetailName, palletId, toLocationName) {
        let worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.RETURN, ['worksheet', 'worksheet.releaseGood', 'targetInventory', 'targetInventory.inventory']);
        const worksheet = worksheetDetail.worksheet;
        const releaseGood = worksheet.releaseGood;
        let targetInventory = worksheetDetail.targetInventory;
        let inventory = targetInventory.inventory;
        const originLocation = inventory.location;
        const originPalletId = inventory.palletId;
        const toLocation = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
            where: { domain: this.domain, name: toLocationName },
            relations: ['warehouse']
        });
        if (!toLocation)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(toLocationName));
        const isPalletDiff = originPalletId !== palletId;
        if (isPalletDiff) {
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('return', 'pallet ID is not matched'));
        }
        inventory.qty += targetInventory.releaseQty;
        inventory.weight += targetInventory.releaseWeight;
        inventory.status = warehouse_base_1.INVENTORY_STATUS.STORED;
        const isLocationChanged = originLocation.id !== toLocation.id;
        if (isLocationChanged) {
            inventory.location = toLocation;
            inventory.warehouse = toLocation.warehouse;
            inventory.zone = toLocation.zone;
        }
        await this.transactionInventory(inventory, releaseGood, targetInventory.releaseQty, targetInventory.releaseWeight, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.RETURN);
        // update status of order inventory
        targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
        targetInventory.updater = this.user;
        await this.updateOrderTargets([targetInventory]);
        // update status of worksheet detail (EXECUTING => DONE)
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async completeReturning(releaseGoodNo) {
        const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, {
            domain: this.domain,
            name: releaseGoodNo,
            status: sales_base_1.ORDER_STATUS.PARTIAL_RETURN
        });
        const worksheet = await this.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.RETURN, [
            'worksheetDestails',
            'worksheetDestails.targetInventory'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        return await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.DONE);
    }
}
exports.ReturningWorksheetController = ReturningWorksheetController;
//# sourceMappingURL=returning-worksheet-controller.js.map