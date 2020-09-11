"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const vas_worksheet_controller_1 = require("../vas/vas-worksheet-controller");
const putaway_worksheet_controller_1 = require("./putaway-worksheet-controller");
class UnloadingWorksheetController extends vas_worksheet_controller_1.VasWorksheetController {
    async generateUnloadingWorksheet(arrivalNoticeNo, bufferLocationId) {
        var _a;
        let arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, {
            domain: this.domain,
            name: arrivalNoticeNo,
            status: sales_base_1.ORDER_STATUS.ARRIVED
        }, ['bizplace', 'orderProducts', 'orderVass']);
        const orderProducts = arrivalNotice.orderProducts;
        const orderVASs = arrivalNotice.orderVass;
        const bufferLocation = await this.trxMgr.getRepository(warehouse_base_1.Location).findOne(bufferLocationId);
        const worksheet = await this.generateWorksheet(constants_1.WORKSHEET_TYPE.UNLOADING, arrivalNotice, orderProducts, sales_base_1.ORDER_STATUS.READY_TO_UNLOAD, sales_base_1.ORDER_PRODUCT_STATUS.READY_TO_UNLOAD, { bufferLocation });
        if (((_a = orderVASs) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            await this.generateVasWorksheet(arrivalNotice);
        }
        return worksheet;
    }
    async preunload(worksheetDetailName, adjustedBatchId, passedPalletQty, palletQty) {
        let worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.UNLOADING, ['targetProduct']);
        let targetProduct = worksheetDetail.targetProduct;
        const isPalletQtyChanged = passedPalletQty !== palletQty;
        if (isPalletQtyChanged)
            targetProduct.adjustedPalletQty = passedPalletQty;
        targetProduct.updater = this.user;
        if (adjustedBatchId) {
            targetProduct.adjustedBatchId = adjustedBatchId;
            targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.PENDING_APPROVAL;
        }
        else {
            targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.INSPECTED;
        }
        await this.updateOrderTargets([targetProduct]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.INSPECTED;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async undoPreunload(worksheetDetailName) {
        let worksheetDetail = await this.findWorksheetDetailByName(worksheetDetailName, ['targetProduct']);
        this.checkRecordValidity(worksheetDetail, { status: constants_1.WORKSHEET_STATUS.INSPECTED });
        let targetProduct = worksheetDetail.targetProduct;
        targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.READY_TO_UNLOAD;
        targetProduct.adjustedBatchId = null;
        targetProduct.adjustedPalletQty = null;
        targetProduct.updater = this.user;
        await this.updateOrderTargets([targetProduct]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.DEACTIVATED;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async unload(worksheetDetailName, inventory) {
        var _a;
        const palletId = inventory.palletId;
        this.checkPalletDuplication(palletId);
        const worksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.UNLOADING, [
            'bizplace',
            'worksheet',
            'worksheet.arrivalNotice',
            'worksheet.bufferLocation',
            'worksheet.bufferLocation.warehouse',
            'targetProduct',
            'targetProduct.product'
        ]);
        const bizplace = worksheetDetail.bizplace;
        const worksheet = worksheetDetail.worksheet;
        const arrivalNotice = worksheet.arrivalNotice;
        const targetProduct = worksheetDetail.targetProduct;
        const batchId = targetProduct.batchId;
        const product = targetProduct.product;
        const packingType = targetProduct.packingType;
        const qty = inventory.qty;
        const weight = Math.round(qty * targetProduct.weight * 100) / 100;
        const location = worksheet.bufferLocation;
        const warehouse = location.warehouse;
        const zone = location.zone;
        let newInventory = new warehouse_base_1.Inventory();
        newInventory.bizplace = bizplace;
        newInventory.name = warehouse_base_1.InventoryNoGenerator.inventoryName();
        newInventory.palletId = palletId;
        newInventory.batchId = batchId;
        newInventory.product = product;
        newInventory.packingType = packingType;
        newInventory.qty = qty;
        newInventory.weight = weight;
        newInventory.refOrderId = arrivalNotice.id;
        if ((_a = inventory.reusablePallet) === null || _a === void 0 ? void 0 : _a.id) {
            newInventory.reusablePallet = await this.trxMgr.getRepository(warehouse_base_1.Pallet).findOne(inventory.reusablePallet.id);
        }
        newInventory.orderProductId = targetProduct.id;
        newInventory.warehouse = warehouse;
        newInventory.location = location;
        newInventory.zone = zone;
        newInventory.status = warehouse_base_1.INVENTORY_STATUS.UNLOADED;
        newInventory = await this.transactionInventory(newInventory, arrivalNotice, newInventory.qty, newInventory.weight, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.UNLOADING);
        targetProduct.actualPalletQty++;
        targetProduct.actualPackQty += qty;
        targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.UNLOADED;
        targetProduct.updater = this.user;
        this.updateOrderTargets([targetProduct]);
    }
    async undoUnload(worksheetDetailName, palletId) {
        const worksheetDetail = await this.findWorksheetDetailByName(worksheetDetailName, [
            'targetProduct',
            'worksheet',
            'worksheet.arrivalNotice'
        ]);
        this.checkRecordValidity(worksheetDetail, {
            status: (status) => {
                const availableStatus = [constants_1.WORKSHEET_STATUS.EXECUTING, constants_1.WORKSHEET_STATUS.PARTIALLY_UNLOADED];
                if (availableStatus.indexOf(status) < 0) {
                    throw new Error(this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE('status', 'Executing or Partially Unloaded', status));
                }
                return true;
            }
        });
        const worksheet = worksheetDetail.worksheet;
        const arrivalNotice = worksheet.arrivalNotice;
        let inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findOne({
            where: { domain: this.domain, status: warehouse_base_1.INVENTORY_STATUS.UNLOADED, palletId },
            relations: ['location']
        });
        const qty = inventory.qty;
        let targetProduct = worksheetDetail.targetProduct;
        targetProduct.actualPackQty -= qty;
        targetProduct.actualPalletQty--;
        targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.UNLOADING;
        targetProduct.updater = this.user;
        await this.updateOrderTargets([targetProduct]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.EXECUTING;
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
        inventory.lastSeq++;
        inventory.status = warehouse_base_1.INVENTORY_STATUS.DELETED;
        inventory.qty = 0;
        inventory.weight = 0;
        inventory.updater = this.user;
        inventory = await this.transactionInventory(inventory, arrivalNotice, -inventory.qty, -inventory.weight, warehouse_base_1.INVENTORY_TRANSACTION_TYPE.UNDO_UNLOADING);
        await this.trxMgr.getRepository(warehouse_base_1.Inventory).delete(inventory.id);
    }
    async activateUnloading(worksheetNo, unloadingWorksheetDetails) {
        let worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.UNLOADING, [
            'bizplace',
            'arrivalNotice',
            'worksheetDetails',
            'worksheetDetails.targetProduct',
            'worksheetDetails.targetProduct.product'
        ]);
        const bizplace = worksheet.bizplace;
        let worksheetDetails = worksheet.worksheetDetails;
        const targetProducts = worksheetDetails.map((wsd) => {
            let targetProduct = wsd.targetProduct;
            if (!targetProduct.palletQty) {
                const { palletQty } = this.findMatchedWSD(wsd.name, unloadingWorksheetDetails);
                targetProduct.palletQty = palletQty;
            }
            targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.UNLOADING;
            targetProduct.updater = this.user;
            return targetProduct;
        });
        await this.updateOrderTargets(targetProducts);
        let arrivalNotice = worksheet.arrivalNotice;
        arrivalNotice.status = sales_base_1.ORDER_STATUS.PROCESSING;
        arrivalNotice.updater = this.user;
        this.updateRefOrder(arrivalNotice);
        const palletizingWSDs = this.filterPalletizingWSDs(unloadingWorksheetDetails);
        if (palletizingWSDs.length > 0) {
            this.createPalletizingWSDs(bizplace, arrivalNotice, worksheetDetails, unloadingWorksheetDetails);
        }
        worksheet = await this.activateWorksheet(worksheet, worksheetDetails, unloadingWorksheetDetails);
        try {
            const vasWorksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.VAS);
            if (vasWorksheet) {
                await this.activateVAS(vasWorksheet.name, vasWorksheet.worksheetDetails);
            }
        }
        catch (e) { }
        return worksheet;
    }
    async completeUnloading(arrivalNoticeNo, unloadingWorksheetDetails) {
        var _a, _b, _c;
        let arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, { domain: this.domain, name: arrivalNoticeNo, status: sales_base_1.ORDER_STATUS.PROCESSING }, ['orderProducts', 'releaseGood']);
        if (arrivalNotice.crossDocking) {
            // Picking worksheet for cross docking should be completed before complete it
            // Find picking worksheet
            const releaseGood = arrivalNotice.releaseGood;
            const executingPickingWS = await this.trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: {
                    domain: this.domain,
                    releaseGood,
                    type: constants_1.WORKSHEET_TYPE.PICKING,
                    status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.DONE))
                }
            });
            if (executingPickingWS)
                throw new Error(`Picking should be completed before complete unloading for cross docking.`);
        }
        if (arrivalNotice.orderProducts.some((op) => op.status === sales_base_1.ORDER_PRODUCT_STATUS.READY_TO_APPROVED)) {
            throw new Error(`There's non-approved order products`);
        }
        let worksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.UNLOADING, [
            'worksheetDetails',
            'worksheetDetails.targetProduct'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        const partiallyUnloadedCnt = await this.trxMgr.getRepository(warehouse_base_1.Inventory).count({
            where: { domain: this.domain, refOrderId: arrivalNotice.id, status: warehouse_base_1.INVENTORY_STATUS.PARTIALLY_UNLOADED }
        });
        if (partiallyUnloadedCnt) {
            throw new Error('There is partially unloaded pallet, generate putaway worksheet before complete unloading.');
        }
        const worksheetDetails = worksheet.worksheetDetails;
        unloadingWorksheetDetails = this.renewWorksheetDetails(worksheetDetails, unloadingWorksheetDetails, {
            status: constants_1.WORKSHEET_STATUS.DONE,
            updater: this.user
        });
        unloadingWorksheetDetails.forEach((wsd) => {
            wsd.targetProduct.remark = wsd.issue || wsd.targetProduct.remark;
        });
        if (arrivalNotice.status !== sales_base_1.ORDER_STATUS.PUTTING_AWAY) {
            arrivalNotice.status = sales_base_1.ORDER_STATUS.READY_TO_PUTAWAY;
            arrivalNotice.updater = this.user;
            arrivalNotice = await this.updateRefOrder(arrivalNotice);
        }
        const inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).find({
            where: {
                domain: this.domain,
                refOrderId: arrivalNotice.id,
                status: warehouse_base_1.INVENTORY_STATUS.UNLOADED
            }
        });
        const putawayWorksheetController = new putaway_worksheet_controller_1.PutawayWorksheetController(this.trxMgr, this.domain, this.user);
        let putawayWorksheet = await putawayWorksheetController.generatePutawayWorksheet(arrivalNoticeNo, inventories);
        if (!((_b = (_a = putawayWorksheet) === null || _a === void 0 ? void 0 : _a.worksheetDetails) === null || _b === void 0 ? void 0 : _b.length)) {
            putawayWorksheet = await this.findWorksheetByNo(putawayWorksheet.name);
        }
        if (((_c = putawayWorksheet) === null || _c === void 0 ? void 0 : _c.status) === constants_1.WORKSHEET_STATUS.DEACTIVATED) {
            await putawayWorksheetController.activatePutaway(putawayWorksheet.name, putawayWorksheet.worksheetDetails);
        }
        await this.completWorksheet(worksheet);
    }
    async completeUnloadingPartially(arrivalNoticeNo, unloadingWorksheetDetail) {
        const arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, {
            name: arrivalNoticeNo,
            status: sales_base_1.ORDER_STATUS.PROCESSING
        });
        const worksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.UNLOADING, [
            'worksheetDetails',
            'worksheetDetails.targetProduct'
        ]);
        this.checkRecordValidity(worksheet, { status: constants_1.WORKSHEET_STATUS.EXECUTING });
        let worksheetDetail = worksheet.worksheetDetails.find((wsd) => wsd.name === unloadingWorksheetDetail.name);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.PARTIALLY_UNLOADED;
        worksheetDetail.issue = unloadingWorksheetDetail.issue || worksheetDetail.issue;
        worksheetDetail.updater = this.user;
        worksheetDetail = await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
        let targetProduct = worksheetDetail.targetProduct;
        targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.PARTIALLY_UNLOADED;
        targetProduct.remark = worksheetDetail.issue || targetProduct.remark;
        await this.updateOrderTargets([targetProduct]);
        let inventories = await this.trxMgr.getRepository(warehouse_base_1.Inventory).find({
            where: {
                domain: this.domain,
                refOrderId: arrivalNotice.id,
                orderProductId: targetProduct.id,
                status: warehouse_base_1.INVENTORY_STATUS.UNLOADED
            }
        });
        inventories.forEach((inventory) => {
            inventory.status = warehouse_base_1.INVENTORY_STATUS.PARTIALLY_UNLOADED;
            inventory.updater = this.user;
        });
        await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventories);
        return worksheet;
    }
    async completePreunloading(arrivalNoticeNo) {
        const arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, { domain: this.domain, name: arrivalNoticeNo, status: sales_base_1.ORDER_STATUS.READY_TO_UNLOAD }, ['orderProducts']);
        const orderProducts = arrivalNotice.orderProducts;
        let unloadableOrderProducts = orderProducts
            .filter((orderProduct) => !orderProduct.adjustedPalletQty)
            .map((orderProduct) => {
            orderProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.READY_TO_UNLOAD;
            orderProduct.updater = this.user;
        });
        await this.updateOrderTargets(unloadableOrderProducts);
        let unloadingWorksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.UNLOADING);
        unloadingWorksheet.status = constants_1.WORKSHEET_STATUS.PENDING_ADJUSTMENT;
        unloadingWorksheet.updater = this.user;
        return await this.trxMgr.getRepository(entities_1.Worksheet).save(unloadingWorksheet);
    }
    async createPalletizingWSDs(bizplace, arrivalNotice, worksheetDetails, palletizingWSDs) {
        let palletizingOrderVASs = [];
        for (let palletizingWSD of palletizingWSDs) {
            const palletizingVAS = await this.trxMgr.getRepository(sales_base_1.Vas).findOne({
                where: { domain: this.domain, id: palletizingWSD.palletizingVasId }
            });
            const targetProduct = worksheetDetails.find((wsd) => wsd.name === palletizingWSD.name);
            palletizingOrderVASs.push({
                domain: this.domain,
                bizplace,
                name: sales_base_1.OrderNoGenerator.orderVas(),
                arrivalNotice,
                vas: palletizingVAS,
                targetType: sales_base_1.VAS_TARGET_TYPES.BATCH_AND_PRODUCT_TYPE,
                targetBatchId: targetProduct.batchId,
                targetProduct: targetProduct.product,
                packingType: targetProduct.packingType,
                description: palletizingWSD.palletizingDescription,
                type: sales_base_1.ORDER_TYPES.ARRIVAL_NOTICE,
                status: sales_base_1.ORDER_VAS_STATUS.COMPLETED,
                creator: this.user,
                updater: this.user
            });
        }
        this.trxMgr.getRepository(sales_base_1.OrderVas).save(palletizingOrderVASs);
        let vasWorksheet = await this.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.VAS);
        if (!vasWorksheet) {
            this.generateVasWorksheet(arrivalNotice);
        }
        else {
            await this.createWorksheetDetails(vasWorksheet, constants_1.WORKSHEET_TYPE.VAS, palletizingOrderVASs);
        }
    }
    filterPalletizingWSDs(unloadingWSDs) {
        return unloadingWSDs.filter((wsd) => wsd.palletQty && wsd.palletizingDescription);
    }
}
exports.UnloadingWorksheetController = UnloadingWorksheetController;
//# sourceMappingURL=unloading-worksheet-controller.js.map