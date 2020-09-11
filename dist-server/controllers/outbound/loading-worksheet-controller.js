"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const utils_1 = require("../../utils");
const vas_worksheet_controller_1 = require("../vas/vas-worksheet-controller");
class LoadingWorksheetController extends vas_worksheet_controller_1.VasWorksheetController {
    async generateLoadingWorksheet(releaseGoodNo, targetInventories) {
        const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, { domain: this.domain, name: releaseGoodNo }, ['bizplace']);
        return await this.generateWorksheet(constants_1.WORKSHEET_TYPE.LOADING, releaseGood, targetInventories, sales_base_1.ORDER_STATUS.LOADING, sales_base_1.ORDER_INVENTORY_STATUS.LOADING);
    }
    async activateLoading(worksheetNo, loadingWorksheetDetails) {
        const worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.LOADING, [
            'releaseGood',
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        let releaseGood = worksheet.releaseGood;
        const nonFinishedVasCnt = await this.trxMgr.getRepository(entities_1.Worksheet).count({
            where: {
                domain: this.domain,
                releaseGood,
                type: constants_1.WORKSHEET_TYPE.VAS,
                status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.DONE))
            }
        });
        if (nonFinishedVasCnt)
            return;
        const worksheetDetails = worksheet.worksheetDetails;
        const targetInventories = worksheetDetails.map((wsd) => {
            let targetInventory = wsd.targetInventory;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADING;
            targetInventory.updater = this.user;
            return targetInventory;
        });
        releaseGood.status = sales_base_1.ORDER_STATUS.LOADING;
        releaseGood.updater = this.user;
        await this.updateRefOrder(releaseGood);
        await this.updateOrderTargets(targetInventories);
        return await this.activateWorksheet(worksheet, worksheetDetails, loadingWorksheetDetails);
    }
    async loading(releaseGoodNo, worksheetDetails) {
        const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, { domain: this.domain, name: releaseGoodNo }, ['bizplace']);
        const bizplace = releaseGood.bizplace;
        for (let worksheetDetail of worksheetDetails) {
            const loadedQty = worksheetDetail.loadedQty;
            worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetail.name, constants_1.WORKSHEET_TYPE.LOADING, [
                'worksheet',
                'targetInventory',
                'targetInventory.inventory'
            ]);
            const worksheet = worksheetDetail.worksheet;
            let targetInventory = worksheetDetail.targetInventory;
            const pickedQty = targetInventory.releaseQty;
            let inventory = targetInventory.inventory;
            if (loadedQty > pickedQty) {
                throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('load', `loaded quantity can't exceed picked qty`));
            }
            else if (loadedQty == pickedQty) {
                // Change status of current worksheet detail
                worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
                worksheetDetail.updater = this.user;
                await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
                // Change status of order inventory
                targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADED;
                targetInventory.updater = this.user;
                targetInventory = await this.updateOrderTargets(targetInventory);
            }
            else if (loadedQty < pickedQty) {
                const remainQty = pickedQty - loadedQty;
                const loadedWeight = parseFloat(((targetInventory.releaseWeight / pickedQty) * loadedQty).toFixed(2));
                const remainWeight = parseFloat((targetInventory.releaseWeight - loadedWeight).toFixed(2));
                targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADED;
                targetInventory.releaseQty = loadedQty;
                targetInventory.releaseWeight = loadedWeight;
                targetInventory.updater = this.user;
                targetInventory = await this.updateOrderTargets(targetInventory);
                worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
                worksheetDetail.updater = this.user;
                worksheetDetail = await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
                // Create order inventory for remaining item
                let newTargetInventory = Object.assign({}, targetInventory);
                delete newTargetInventory.id;
                newTargetInventory.domain = this.domain;
                newTargetInventory.bizplace = bizplace;
                newTargetInventory.name = sales_base_1.OrderNoGenerator.orderInventory();
                newTargetInventory.releaseGood = releaseGood;
                newTargetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADING;
                newTargetInventory.releaseQty = remainQty;
                newTargetInventory.releaseWeight = remainWeight;
                newTargetInventory.creator = this.user;
                newTargetInventory.updater = this.user;
                newTargetInventory = await this.updateOrderTargets(newTargetInventory);
                await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.LOADING, [newTargetInventory], {
                    status: constants_1.WORKSHEET_STATUS.EXECUTING
                });
            }
            await utils_1.generateInventoryHistory(inventory, releaseGood, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.LOADING, 0, 0, this.user, this.trxMgr);
        }
    }
    async undoLoading(deliveryOrder, palletIds) {
        deliveryOrder = await this.findRefOrder(sales_base_1.DeliveryOrder, deliveryOrder, [
            'releaseGood',
            'orderInventories',
            'orderInventories.inventory'
        ]);
        const releaseGood = deliveryOrder.releaseGood;
        // Filter out inventories which is included palletIds list.
        const targetInventories = deliveryOrder.orderInventories;
        let undoTargetOrderInventories = targetInventories.filter((targetInventory) => targetInventory.status === sales_base_1.ORDER_INVENTORY_STATUS.LOADED &&
            palletIds.includes(targetInventory.inventory.palletId));
        // If there was remained items => Merge into previous order inventories
        for (let undoTargetOrderInventory of undoTargetOrderInventories) {
            undoTargetOrderInventory.deliveryOrder = null;
            undoTargetOrderInventory.updater = this.user;
            let prevTargetInventory = await this.trxMgr.getRepository(sales_base_1.OrderInventory).findOne({
                where: {
                    domain: this.domain,
                    id: typeorm_1.Not(typeorm_1.Equal(undoTargetOrderInventory.id)),
                    releaseGood,
                    status: sales_base_1.ORDER_INVENTORY_STATUS.LOADING,
                    inventory: undoTargetOrderInventory.inventory
                }
            });
            if (prevTargetInventory) {
                // If there's prev target inventory
                // Merge qty and weight into prev target inventory
                prevTargetInventory.releaseQty += undoTargetOrderInventory.releaseQty;
                prevTargetInventory.releaseWeight += undoTargetOrderInventory.releaseWeight;
                prevTargetInventory.updater = this.user;
                await this.updateOrderTargets([prevTargetInventory]);
                // Terminate undo target order inventory
                undoTargetOrderInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
                await this.updateOrderTargets([undoTargetOrderInventory]);
                // Delete worksheet detail
                await this.trxMgr.getRepository(entities_1.WorksheetDetail).delete({
                    targetInventory: undoTargetOrderInventory,
                    type: constants_1.WORKSHEET_TYPE.LOADING,
                    status: constants_1.WORKSHEET_STATUS.DONE
                });
            }
            else {
                // Update undo target inventory
                undoTargetOrderInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADING;
                undoTargetOrderInventory = await this.updateOrderTargets([undoTargetOrderInventory]);
                // Update worksheet detail to be able to load
                let undoTargetWorksheetDetail = await this.findWorksheetDetail({
                    targetInventory: undoTargetOrderInventory,
                    type: constants_1.WORKSHEET_TYPE.LOADING,
                    status: constants_1.WORKSHEET_STATUS.DONE
                });
                undoTargetWorksheetDetail.status = constants_1.WORKSHEET_STATUS.EXECUTING;
                undoTargetWorksheetDetail.updater = this.user;
                await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(undoTargetWorksheetDetail);
            }
            // Create inventory history
            let inventory = undoTargetOrderInventory.inventory;
            await utils_1.generateInventoryHistory(inventory, releaseGood, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.UNDO_LOADING, 0, 0, this.user);
        }
        // Compare total inventories length and undo target inventories length
        // to check whether there's more order inventories
        // If thres' no more remove delivery order
        if (targetInventories.length === undoTargetOrderInventories.length) {
            await this.trxMgr.getRepository(sales_base_1.OrderInventory).delete(deliveryOrder.id);
        }
    }
    async completeLoading(releaseGoodNo) {
        const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, {
            domain: this.domain,
            name: releaseGoodNo,
            status: sales_base_1.ORDER_STATUS.LOADING
        });
        const worksheet = await this.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.LOADING, [
            'worksheetDestails',
            'worksheetDestails.targetInventory'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        return await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.DONE);
    }
}
exports.LoadingWorksheetController = LoadingWorksheetController;
//# sourceMappingURL=loading-worksheet-controller.js.map