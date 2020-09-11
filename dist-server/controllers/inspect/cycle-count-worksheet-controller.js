"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const worksheet_controller_1 = require("../worksheet-controller");
class CycleCountWorksheetController extends worksheet_controller_1.WorksheetController {
    async generateCycleCountWorksheet(cycleCountNo, inventories) {
        const cycleCount = await this.findRefOrder(sales_base_1.InventoryCheck, {
            domain: this.domain,
            name: cycleCountNo,
            status: sales_base_1.ORDER_STATUS.PENDING
        }, ['bizplace']);
        const bizplace = cycleCount.bizplace;
        if (inventories.some((inv) => !(inv instanceof warehouse_base_1.Inventory))) {
            const palletIds = inventories.map((inv) => inv.palletId);
            inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).find({
                where: { domain: this.domain, palletId: typeorm_1.In(palletIds), status: warehouse_base_1.INVENTORY_STATUS.STORED }
            });
        }
        /* Update inventories to lock up available qty & weight */
        inventories.forEach((inv) => {
            inv.lockedQty = inv.qty;
            inv.lockedWeight = inv.weight;
            inv.updater = this.user;
        });
        inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventories);
        let targetInventories = inventories.map((inventory) => {
            return {
                domain: this.domain,
                bizplace,
                status: sales_base_1.ORDER_INVENTORY_STATUS.PENDING,
                name: sales_base_1.OrderNoGenerator.orderInventory(),
                InventoryCheck: cycleCount,
                releaseQty: 0,
                releaseWeight: 0,
                inventory,
                creator: this.user,
                updater: this.user
            };
        });
        targetInventories = await this.trxMgr.getRepository(sales_base_1.OrderInventory).save(targetInventories);
        return await this.generateWorksheet(constants_1.WORKSHEET_TYPE.CYCLE_COUNT, cycleCount, targetInventories, cycleCount.status, sales_base_1.ORDER_INVENTORY_STATUS.PENDING);
    }
    async activateCycleCount(worksheetNo) {
        const worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.CYCLE_COUNT, [
            'inventoryCheck',
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        const worksheetDetails = worksheet.worksheetDetails;
        const targetInventories = worksheetDetails.map((wsd) => {
            let targetInventory = wsd.targetInventory;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.INSPECTING;
            targetInventory.updater = this.user;
            return targetInventory;
        });
        let cycleCount = worksheet.inventoryCheck;
        cycleCount.status = sales_base_1.ORDER_STATUS.INSPECTING;
        cycleCount.updater = this.user;
        await this.updateRefOrder(cycleCount);
        await this.updateOrderTargets(targetInventories);
        return await this.activateWorksheet(worksheet, worksheetDetails, []);
    }
    async inspecting(worksheetDetailName, palletId, locationName, inspectedQty) {
        let worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.CYCLE_COUNT, ['targetInventory', 'targetInventory.inventory', 'targetInventory.inventory.location']);
        let targetInventory = worksheetDetail.targetInventory;
        let inventory = targetInventory.inventory;
        const beforeLocation = inventory.location;
        const currentLocation = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
            where: { domain: this.domain, name: locationName }
        });
        if (!currentLocation)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(locationName));
        if (inventory.palletId !== palletId)
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('inspect', 'pallet ID is invalid'));
        if (beforeLocation.name !== currentLocation.name || inspectedQty !== inventory.qty) {
            worksheetDetail.status = constants_1.WORKSHEET_STATUS.NOT_TALLY;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.NOT_TALLY;
        }
        else {
            worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.INSPECTED;
        }
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
        targetInventory.inspectedLocation = currentLocation;
        targetInventory.inspectedQty = inspectedQty;
        targetInventory.updater = this.user;
        await this.updateOrderTargets([targetInventory]);
    }
    async undoInspection(worksheetDetailName) {
        let worksheetDetail = await this.findWorksheetDetail({ domain: this.domain, name: worksheetDetailName, status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.EXECUTING)) }, ['targetInventory']);
        let targetInventory = worksheetDetail.targetInventory;
        targetInventory.inspectedLocaiton = null;
        targetInventory.inspectedQty = null;
        targetInventory.inspectedWeight = null;
        targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.INSPECTING;
        targetInventory.updater = this.user;
        await this.updateOrderTargets([targetInventory]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.EXECUTING;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async completeCycleCount(inventoryCheckNo) {
        var _a;
        const inventoryCheck = await this.findRefOrder(sales_base_1.InventoryCheck, {
            name: inventoryCheckNo,
            status: sales_base_1.ORDER_STATUS.INSPECTING
        });
        let worksheet = await this.findWorksheetByRefOrder(inventoryCheck, constants_1.WORKSHEET_TYPE.CYCLE_COUNT, [
            'worksheetDetails',
            'worksheetDetails.targetInventory',
            'worksheetDetails.targetInventory.inventory'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        const worksheetDetails = worksheet.worksheetDetails;
        let targetInventories = worksheetDetails.map((wsd) => wsd.targetInventory);
        const notTallyWorksheetDetails = worksheetDetails.filter((wsd) => wsd.status === constants_1.WORKSHEET_STATUS.NOT_TALLY);
        // terminate all order inventory if all inspection accuracy is 100%
        if (!((_a = notTallyWorksheetDetails) === null || _a === void 0 ? void 0 : _a.length)) {
            targetInventories.forEach((targetInventory) => {
                targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
                targetInventory.updater = this.user;
            });
            await this.updateOrderTargets(targetInventories);
            worksheet = await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.DONE);
        }
        else {
            let { tallyTargetInventories, nonTallyTargetInventories } = targetInventories.reduce((inspectionResult, targetInventory) => {
                if (targetInventory.status === sales_base_1.ORDER_INVENTORY_STATUS.INSPECTED) {
                    inspectionResult.tallyTargetInventories.push(targetInventory);
                }
                else {
                    inspectionResult.nonTallyTargetInventories.push(targetInventory);
                }
                return inspectionResult;
            }, { tallyTargetInventories: [], nonTallyTargetInventories: [] });
            let inventories = tallyTargetInventories.map((targetInventory) => targetInventory.inventory);
            inventories.forEach((inventory) => {
                inventory.lockedQty = 0;
                inventory.lockedWeight = 0;
                inventory.updater = this.user;
            });
            await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventories);
            worksheet = await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.PENDING_REVIEW);
            nonTallyTargetInventories.forEach((targetInventory) => {
                targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.INSPECTING;
                targetInventory.updater = this.user;
            });
            await this.updateOrderTargets(nonTallyTargetInventories);
        }
        return worksheet;
    }
}
exports.CycleCountWorksheetController = CycleCountWorksheetController;
//# sourceMappingURL=cycle-count-worksheet-controller.js.map