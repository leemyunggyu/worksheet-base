"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const product_base_1 = require("@things-factory/product-base");
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const vas_worksheet_controller_1 = require("../vas/vas-worksheet-controller");
class PickingWorksheetController extends vas_worksheet_controller_1.VasWorksheetController {
    async generatePickingWorksheet(releaseGoodNo) {
        var _a;
        let releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, {
            domain: this.domain,
            name: releaseGoodNo,
            status: sales_base_1.ORDER_STATUS.PENDING_RECEIVE
        }, ['orderInventories', 'orderInventories.inventory', 'orderVass']);
        const orderInventories = releaseGood.orderInventories;
        const orderVASs = releaseGood.orderVass;
        let worksheet = await this.createWorksheet(releaseGood, constants_1.WORKSHEET_TYPE.PICKING);
        if (orderInventories.every((oi) => { var _a; return (_a = oi.inventory) === null || _a === void 0 ? void 0 : _a.id; }) || releaseGood.crossDocking) {
            worksheet.worksheetDetails = await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.PICKING, orderInventories);
            const inventories = orderInventories.map((oi) => {
                let inventory = oi.inventory;
                inventory.lockedQty = oi.releaseQty;
                inventory.lockedWeight = oi.releaseWeight;
                inventory.updater = this.user;
            });
            await this.updateInventory(inventories);
        }
        orderInventories.forEach((oi) => {
            var _a;
            oi.status =
                oi.crossDocking || ((_a = oi.inventory) === null || _a === void 0 ? void 0 : _a.id)
                    ? sales_base_1.ORDER_INVENTORY_STATUS.READY_TO_PICK
                    : sales_base_1.ORDER_INVENTORY_STATUS.PENDING_SPLIT;
            oi.updater = this.user;
        });
        await this.updateOrderTargets(orderInventories);
        if (((_a = orderVASs) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            await this.generateVasWorksheet(releaseGood);
        }
        releaseGood.status = sales_base_1.ORDER_STATUS.READY_TO_PICK;
        releaseGood.updater = this.user;
        await this.updateRefOrder(releaseGood);
        return worksheet;
    }
    async activatePicking(worksheetNo) {
        var _a;
        let worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.PICKING, [
            'releaseGood',
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        const worksheetDetails = worksheet.worksheetDetails;
        const targetInventories = worksheetDetails.map((wsd) => {
            let targetInventory = wsd.targetInventory;
            targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.PICKING;
            targetInventory.updater = this.user;
            return targetInventory;
        });
        this.updateOrderTargets(targetInventories);
        let releaseGood = worksheet.releaseGood;
        releaseGood.status = sales_base_1.ORDER_STATUS.PICKING;
        releaseGood.updater = this.user;
        this.updateRefOrder(releaseGood);
        worksheet = await this.activateWorksheet(worksheet, worksheetDetails, []);
        try {
            const vasWorksheet = await this.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.VAS);
            if (vasWorksheet) {
                await this.activateVAS(vasWorksheet.name, vasWorksheet.worksheetDetails);
            }
        }
        catch (e) { }
        const pendingSplitOIs = await this.trxMgr.getRepository(sales_base_1.OrderInventory).find({
            where: { domain: this.domain, releaseGood, status: sales_base_1.ORDER_INVENTORY_STATUS.PENDING_SPLIT }
        });
        if ((_a = pendingSplitOIs) === null || _a === void 0 ? void 0 : _a.length) {
            const ids = pendingSplitOIs.map((oi) => oi.id);
            await this.trxMgr.getRepository(sales_base_1.OrderInventory).delete(ids);
        }
        return worksheet;
    }
    async assignPikcingInventories(worksheetNo, batchId, productId, packingType, worksheetDetails) {
        var _a, _b, _c;
        // 1. Remove prev worksheet details if it's exists
        const worksheet = await this.findWorksheetByNo(worksheetNo, [
            'bizplace',
            'releaseGood',
            'worksheetDetails'
        ]);
        const releaseGood = worksheet.releaseGood;
        const bizplace = worksheet.bizplace;
        const prevWorksheetDetails = await this.extractMatchedWorksheetDetails(worksheet.worksheetDetails, batchId, productId, packingType);
        // Delete order inventories
        if ((_a = prevWorksheetDetails) === null || _a === void 0 ? void 0 : _a.length) {
            const worksheetDetailIds = prevWorksheetDetails.map((wsd) => wsd.id);
            const prevTargetInventoryIds = prevWorksheetDetails.map((wsd) => wsd.targetInventory.id);
            await this.trxMgr.getRepository(entities_1.WorksheetDetail).delete(worksheetDetailIds);
            await this.trxMgr.getRepository(sales_base_1.OrderInventory).delete(prevTargetInventoryIds);
        }
        for (let worksheetDetail of worksheetDetails) {
            if ((_c = (_b = worksheetDetail.targetInventory) === null || _b === void 0 ? void 0 : _b.inventory) === null || _c === void 0 ? void 0 : _c.id) {
                worksheetDetail = await this.findWorksheetDetail(worksheetDetail, [
                    'targetInventory',
                    'targetInventory.inventory'
                ]);
            }
            const targetInventory = worksheetDetail.targetInventory;
            let inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findOne(targetInventory.inventory.id);
            const product = await this.trxMgr.getRepository(product_base_1.Product).findOne(productId);
            // Create order inventories
            let newTargetInventory = Object.assign({}, targetInventory);
            delete newTargetInventory.id;
            newTargetInventory.domain = this.domain;
            newTargetInventory.bizplace = bizplace;
            newTargetInventory.name = sales_base_1.OrderNoGenerator.orderInventory();
            newTargetInventory.releaseGood = releaseGood;
            newTargetInventory.inventory = inventory;
            newTargetInventory.batchId = batchId;
            newTargetInventory.product = product;
            newTargetInventory.packingType = packingType;
            newTargetInventory.creator = this.user;
            newTargetInventory.updater = this.user;
            newTargetInventory = await this.trxMgr.getRepository(sales_base_1.OrderInventory).save(newTargetInventory);
            // Update locked qty and weight of inventory
            inventory.lockedQty = targetInventory.releaseQty + (inventory.lockedQty || 0);
            inventory.lockedWeight = targetInventory.releaseWeight + (inventory.lockedWeight || 0);
            await this.updateInventory(inventory);
            // Create worksheet details
            await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.PICKING, [newTargetInventory]);
        }
    }
    async undoPickingAssigment(worksheetNo, batchId, productId, packingType) {
        const worksheet = await this.findWorksheetByNo(worksheetNo, ['worksheetDetails']);
        const worksheetDetails = await this.extractMatchedWorksheetDetails(worksheet.worksheetDetails, batchId, productId, packingType, ['targetInventory', 'targetInventory.inventory']);
        let worksheetDetailIds = [];
        let targetInventoryIds = [];
        for (const worksheetDetail of worksheetDetails) {
            worksheetDetailIds.push(worksheetDetail.id);
            const targetInventory = worksheetDetail.targetInventory;
            targetInventoryIds.push(targetInventory.id);
            let inventory = worksheetDetail.targetInventory.inventory;
            inventory.lockedQty -= targetInventory.releaseQty;
            inventory.lockedWeight -= targetInventory.releaseWeight;
            await this.updateInventory(inventory);
        }
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).delete(worksheetDetailIds);
        await this.trxMgr.getRepository(sales_base_1.OrderInventory).delete(targetInventoryIds);
    }
    async picking(worksheetDetailName, palletId, locationName, releaseQty) {
        let worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.PICKING, [
            'worksheet',
            'worksheet.releaseGood',
            'targetInventory',
            'targetInventory.inventory',
            'targetInventory.inventory.location'
        ]);
        const releaseGood = worksheetDetail.worksheet.releaseGood;
        let targetInventory = worksheetDetail.targetInventory;
        let inventory = targetInventory.inventory;
        if (inventory.palletId !== palletId)
            throw new Error(this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE('Pallet ID', palletId, inventory.palletId));
        const leftQty = inventory.qty - releaseQty;
        if (leftQty < 0) {
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('picking', `quantity can't exceed limitation`));
        }
        targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.PICKED;
        await this.updateOrderTargets([targetInventory]);
        inventory.qty -= targetInventory.releaseQty;
        inventory.weight = Math.round((inventory.weight - targetInventory.releaseWeight) * 100) / 100;
        inventory.lockedQty = 0;
        inventory.lockedWeight = 0;
        inventory = await this.transactionInventory(inventory, releaseGood, -targetInventory.releaseQty, -targetInventory.releaseWeight, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.PICKING);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
        if (leftQty === 0) {
            inventory.status = warehouse_base_1.INVENTORY_STATUS.TERMINATED;
            await this.transactionInventory(inventory, releaseGood, 0, 0, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.TERMINATED);
        }
        const fromLocation = targetInventory.inventory.location;
        if (locationName) {
            const toLocation = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne({
                where: { domain: this.domain, name: locationName },
                relations: ['warehouse']
            });
            if (!toLocation)
                throw new Error(this.ERROR_MSG.FIND.NO_RESULT(locationName));
            if (fromLocation.id !== toLocation.id) {
                inventory.location = toLocation;
                inventory.warehouse = toLocation.warehouse;
                inventory.zone = toLocation.zone;
                inventory = await this.transactionInventory(inventory, releaseGood, 0, 0, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.RELOCATE);
            }
        }
    }
    async completePicking(releaseGoodNo) {
        let releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, {
            domain: this.domain,
            name: releaseGoodNo,
            status: sales_base_1.ORDER_STATUS.PICKING
        });
        const worksheet = await this.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.PICKING, [
            'worksheetDetails',
            'worksheetDetails.targetInventory'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        return await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.LOADING);
    }
    async extractMatchedWorksheetDetails(worksheetDetails, standardBatchId, standardProductId, standardPackingType, relations = ['targetInventory', 'targetInventory.product']) {
        var _a, _b, _c, _d;
        for (let wsd of worksheetDetails) {
            if (!((_a = wsd.targetInventory) === null || _a === void 0 ? void 0 : _a.batchId) || !((_c = (_b = wsd.targetInventory) === null || _b === void 0 ? void 0 : _b.product) === null || _c === void 0 ? void 0 : _c.id) || !((_d = wsd.targetInventory) === null || _d === void 0 ? void 0 : _d.packingType)) {
                wsd = await this.findWorksheetDetail(wsd, ['targetInventory', 'targetInventory.product']);
            }
        }
        worksheetDetails = worksheetDetails.filter((wsd) => wsd.targetInventory.batchId === standardBatchId &&
            wsd.targetInventory.product.id === standardProductId &&
            wsd.targetInventory.packingType === standardPackingType);
        for (let wsd of worksheetDetails) {
            wsd = await this.findWorksheetDetail(wsd, relations);
        }
        return worksheetDetails;
    }
}
exports.PickingWorksheetController = PickingWorksheetController;
//# sourceMappingURL=picking-worksheet-controller.js.map