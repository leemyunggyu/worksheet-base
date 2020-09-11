"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const constants_1 = require("../../constants");
const entities_1 = require("../../entities");
const vas_transactions_1 = require("../../graphql/resolvers/worksheet/vas-transactions");
const worksheet_controller_1 = require(".././worksheet-controller");
class VasWorksheetController extends worksheet_controller_1.WorksheetController {
    constructor() {
        super(...arguments);
        this.COMPLETE_TRX_MAP = {
            'vas-repalletizing': vas_transactions_1.completeRepalletizing,
            'vas-repack': vas_transactions_1.completeRepackaging,
            'vas-relabel': vas_transactions_1.completeRelabeling
        };
    }
    async generateVasWorksheet(referenceOrder) {
        let orderVASs;
        if (referenceOrder instanceof sales_base_1.ArrivalNotice) {
            const arrivalNotice = await this.findRefOrder(sales_base_1.ArrivalNotice, referenceOrder, ['orderVass']);
            orderVASs = arrivalNotice.orderVass;
        }
        else if (referenceOrder instanceof sales_base_1.ReleaseGood) {
            const releaseGood = await this.findRefOrder(sales_base_1.ReleaseGood, referenceOrder, ['orderVass']);
            orderVASs = releaseGood.orderVass;
        }
        else {
            const vasOrder = await this.findRefOrder(sales_base_1.VasOrder, referenceOrder, ['orderVass']);
            orderVASs = vasOrder.orderVass;
        }
        return await this.generateWorksheet(constants_1.WORKSHEET_TYPE.VAS, referenceOrder, orderVASs, referenceOrder.status, sales_base_1.ORDER_VAS_STATUS.READY_TO_PROCESS);
    }
    async assignInventories(worksheetDetailIds, inventories) {
        const worksheetDetails = await this.trxMgr
            .getRepository(entities_1.WorksheetDetail)
            .findByIds(worksheetDetailIds, {
            relations: [
                'worksheet',
                'targetVas',
                'targetVas.arrivalNotice',
                'targetVas.releaseGood',
                'targetVas.shippingOrder',
                'targetVas.vasOrder',
                'targetVas.vas',
                'targetVas.targetProduct'
            ]
        });
        let seq = 0;
        for (let worksheetDetail of worksheetDetails) {
            const worksheet = worksheetDetail.worksheet;
            const targetVAS = worksheetDetail.targetVas;
            let newWorksheetDetail = Object.assign({}, worksheetDetail);
            delete newWorksheetDetail.id;
            for (let inventory of inventories) {
                let newTargetVAS = Object.assign({}, targetVAS);
                delete newTargetVAS.id;
                inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findOne(inventory.id);
                const unitWeight = inventory.weight / inventory.qty;
                newTargetVAS.domain = this.domain;
                newTargetVAS.name = sales_base_1.OrderNoGenerator.orderVas();
                newTargetVAS.qty = inventories.qty;
                newTargetVAS.weight = inventory.qty * unitWeight;
                newTargetVAS.inventory = inventory;
                newTargetVAS.creator = this.user;
                newTargetVAS.updater = this.user;
                newTargetVAS = await this.trxMgr.getRepository(sales_base_1.OrderVas).save(newTargetVAS);
                await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.VAS, [newTargetVAS]);
                seq++;
            }
            await this.trxMgr.getRepository(entities_1.WorksheetDetail).delete(worksheetDetail.id);
            await this.trxMgr.getRepository(sales_base_1.OrderVas).delete(targetVAS.id);
        }
    }
    async activateVAS(worksheetNo, vasWorksheetDetails) {
        var _a;
        const worksheet = await this.findActivatableWorksheet(worksheetNo, constants_1.WORKSHEET_TYPE.VAS, [
            'vasOrder',
            'worksheetDetails',
            'worksheetDetails.targetVas'
        ]);
        const worksheetDetails = worksheet.worksheetDetails;
        const targetVASs = worksheetDetails.map((wsd) => {
            let targetVAS = wsd.targetVas;
            targetVAS.status = sales_base_1.ORDER_VAS_STATUS.PROCESSING;
            targetVAS.updater = this.user;
            return targetVAS;
        });
        // Update VAS Order if it's pure VAS Order (status: READY_TO_PROCESS => PROCESSING)
        let vasOrder = worksheet.vasOrder;
        if ((_a = vasOrder) === null || _a === void 0 ? void 0 : _a.id) {
            vasOrder.status = sales_base_1.ORDER_STATUS.PROCESSING;
            vasOrder.updater = this.user;
            await this.updateRefOrder(vasOrder);
        }
        await this.updateOrderTargets(targetVASs);
        return await this.activateWorksheet(worksheet, worksheetDetails, vasWorksheetDetails);
    }
    async excuteVAS(worksheetDetail, palletId) {
        const worksheetDetailName = worksheetDetail.name;
        let foundWorksheetDetail = await this.findExecutableWorksheetDetailByName(worksheetDetailName, constants_1.WORKSHEET_TYPE.VAS, [
            'bizplace',
            'worksheet',
            'worksheet.arrivalNotice',
            'worksheet.releaseGood',
            'targetVas',
            'targetVas.vas',
            'targetVas.arrivalNotice',
            'targetVas.releaseGood',
            'targetVas.vasOrder',
            'targetVas.targetProduct'
        ]);
        const bizplace = foundWorksheetDetail.bizplace;
        const worksheet = foundWorksheetDetail.worksheet;
        if (palletId) {
            const inventory = await this.checkPalletAcceptable(palletId, worksheet, foundWorksheetDetail);
            let targetVAS = foundWorksheetDetail.targetVas;
            const totalTargetQty = targetVAS.qty;
            // inventory assigment
            targetVAS.inventory = inventory;
            // 현재 작업 대상 target vas의 수량을 inventory의 수량 만큼 감소 시킴
            targetVAS.qty = inventory.qty;
            targetVAS = await this.trxMgr.getRepository(sales_base_1.OrderVas).save(targetVAS);
            // 남은 수량이 있다면 새로운 worksheet detail과 target vas를 생성
            const remainQty = totalTargetQty - inventory.qty;
            if (remainQty > 0) {
                let newTargetVAS = Object.assign({}, targetVAS);
                delete newTargetVAS.id;
                newTargetVAS.domain = this.domain;
                newTargetVAS.bizplace = bizplace;
                newTargetVAS.name = sales_base_1.OrderNoGenerator.orderVas();
                newTargetVAS.qty = remainQty;
                newTargetVAS.creator = this.user;
                newTargetVAS.updater = this.user;
                newTargetVAS = await this.trxMgr.getRepository(sales_base_1.OrderVas).save(newTargetVAS);
                // Create new worksheet detail
                await this.createWorksheetDetails(worksheet, constants_1.WORKSHEET_TYPE.VAS, [newTargetVAS], {
                    status: foundWorksheetDetail.status
                });
            }
        }
        let targetVAS = foundWorksheetDetail.targetVas;
        if (!targetVAS)
            throw new Error("VAS doesn't exists");
        // 1. update status of worksheetDetail (EXECUTING => DONE)
        foundWorksheetDetail = Object.assign(foundWorksheetDetail, worksheetDetail);
        foundWorksheetDetail.status = constants_1.WORKSHEET_STATUS.DONE;
        foundWorksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(foundWorksheetDetail);
        // 2. update vas
        targetVAS.status = sales_base_1.ORDER_VAS_STATUS.COMPLETED;
        targetVAS.updater = this.user;
        await this.updateOrderTargets([targetVAS]);
    }
    async undoVAS(worksheetDetail) {
        const worksheetDetailName = worksheetDetail.name;
        worksheetDetail = await this.findWorksheetDetailByName(worksheetDetailName, [
            'worksheet',
            'targetVas',
            'targetVas.vas',
            'targetVas.vasOrder',
            'targetVas.inventory'
        ]);
        this.checkRecordValidity(worksheetDetail, { status: constants_1.WORKSHEET_STATUS.DONE, type: constants_1.WORKSHEET_TYPE.VAS });
        let targetVAS = worksheetDetail.targetVas;
        targetVAS.status = sales_base_1.ORDER_VAS_STATUS.PROCESSING;
        targetVAS.updater = this.user;
        await this.updateOrderTargets([targetVAS]);
        worksheetDetail.status = constants_1.WORKSHEET_STATUS.EXECUTING;
        worksheetDetail.issue = '';
        worksheetDetail.updater = this.user;
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetail);
    }
    async checkPalletAcceptable(palletId, worksheet, worksheetDetail) {
        var _a;
        // inventory가 존재해야함
        const inventory = await this.trxMgr.getRepository(warehouse_base_1.Inventory).findOne({
            where: { domain: this.domain, palletId },
            relations: ['product']
        });
        if (!inventory)
            throw new Error(`Can't find inventory by pallet ID (${palletId})`);
        // 현재 작업 set에서 하나라도 모두 완료된 유형의 VAS가 존재할 경우
        // 해당 VAS를 처리한 pallet 리스트에 한하여 작업을 수행 해야함 (동일한 SET는 동일한 군집의 Pallet을 대상으로 처리되어야 하기 때문에)
        worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).findOne(worksheet.id, {
            relations: [
                'worksheetDetails',
                'worksheetDetails.targetVas',
                'worksheetDetails.targetVas.inventory',
                'worksheetDetails.targetVas.vas'
            ]
        });
        const vasIds = worksheet.worksheetDetails
            .filter((wsd) => wsd.targetVas.set === worksheetDetail.targetVas.set)
            .map((wsd) => wsd.targetVas.vas.id);
        let completedCnt = {};
        vasIds.forEach((vasId) => (completedCnt[vasId] = 0));
        worksheet.worksheetDetails.forEach((wsd) => {
            if (wsd.status !== constants_1.WORKSHEET_STATUS.DONE) {
                completedCnt[wsd.targetVas.vas.id]++;
            }
        });
        let finishedVasId;
        for (let vasId in completedCnt) {
            if (completedCnt[vasId] === 0) {
                finishedVasId = vasId;
                break;
            }
        }
        if (finishedVasId) {
            const availPalletIds = worksheet.worksheetDetails
                .filter((wsd) => wsd.targetVas.vas.id === finishedVasId)
                .map((wsd) => wsd.targetVas.inventory.palletId);
            if (availPalletIds.indexOf(inventory.palletId) >= 0) {
                return inventory;
            }
            else {
                throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('execute VAS', `${palletId} is not suitable for doing this VAS`));
            }
        }
        // refOrder에 따라 적절한 상태를 가지고 있어야함
        // Arrival Notice = 'PARTIALLY_UNLOADED or PUTTING_AWAY
        const refOrder = worksheet.arrivalNotice || worksheet.releaseGood;
        if (refOrder instanceof sales_base_1.ArrivalNotice) {
            const acceptableStatus = [warehouse_base_1.INVENTORY_STATUS.PARTIALLY_UNLOADED, warehouse_base_1.INVENTORY_STATUS.PUTTING_AWAY];
            if (acceptableStatus.indexOf(inventory.status) < 0)
                throw new Error(`The pallet doesn't have right status for doing VAS`);
        }
        else if (refOrder instanceof sales_base_1.ReleaseGood) {
            throw new Error('TODO: Status check for Release Good');
        }
        // target vas의 조건에 충족해야 함 (targetBatchId, targetProduct)
        const { targetBatchId, targetProduct } = worksheetDetail.targetVas;
        if (targetBatchId && targetBatchId !== inventory.batchId) {
            throw new Error(`The pallet (${inventory.palletId}) doesn't have correct batch ID (${targetBatchId})`);
        }
        if (((_a = targetProduct) === null || _a === void 0 ? void 0 : _a.id) && targetProduct.id !== inventory.product.id) {
            throw new Error(`The pallet (${inventory.palletId}) doesn't have correct product (${targetProduct.name})`);
        }
        // reference order와 관계되어 있는 inventory여야 함
        if (refOrder instanceof sales_base_1.ArrivalNotice) {
            if (inventory.refOrderId !== refOrder.id)
                throw new Error(`The pallet ${inventory.palletId} is not related with GAN (${refOrder.name})`);
        }
        // 다른 vas order set에 포함되어 있지 않아야함
        const relatedInvs = worksheet.worksheetDetails
            .filter((wsd // 현재 작업대상이 아니고 현재 작업 대상과 같은 세트가 아니고 인벤토리 값이 있는
        ) => wsd.id !== worksheetDetail.id &&
            wsd.targetVas.set !== worksheetDetail.targetVas.set &&
            wsd.targetVas.inventory)
            .map((wsd) => wsd.targetVas.inventory);
        if (relatedInvs.find((relInv) => relInv.palletId === inventory.palletId)) {
            throw new Error(`The pallet (${inventory.palletId}) is already assigned for another VAS SET`);
        }
        // 현재 작업유형에 동이한 pallet으로 처리된 이력이 없어야함
        const completedWSD = worksheet.worksheetDetails.filter((wsd) => wsd.status === constants_1.WORKSHEET_STATUS.DONE &&
            wsd.targetVas.set === worksheetDetail.targetVas.set &&
            wsd.targetVas.vas.id === worksheetDetail.targetVas.vas.id);
        if (completedWSD.find((wsd) => wsd.targetVas.inventory.palletId === palletId)) {
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('execute VAS', `VAS is finished for pallet (${palletId}) already`));
        }
        return inventory;
    }
    async completeVAS(orderNo, orderType) {
        const ENTITY_MAP = {
            [sales_base_1.ORDER_TYPES.ARRIVAL_NOTICE]: sales_base_1.ArrivalNotice,
            [sales_base_1.ORDER_TYPES.RELEASE_OF_GOODS]: sales_base_1.ReleaseGood,
            [sales_base_1.ORDER_TYPES.VAS_ORDER]: sales_base_1.VasOrder
        };
        let refOrder = await this.findRefOrder(ENTITY_MAP[orderType], {
            domain: this.domain,
            name: orderNo
        });
        let worksheet = await this.findWorksheetByRefOrder(refOrder, constants_1.WORKSHEET_TYPE.VAS, [
            'worksheetDetails',
            'worksheetDetails.targetVas',
            'worksheetDetails.targetVas.vas'
        ]);
        const isPureVAS = refOrder instanceof sales_base_1.VasOrder;
        if (isPureVAS) {
            refOrder.status = sales_base_1.ORDER_STATUS.DONE;
            await this.updateRefOrder(refOrder);
        }
        // Do complete operation transactions if there it is
        const worksheetDetails = worksheet.worksheetDetails;
        const targetVASs = worksheetDetails.map((wsd) => wsd.targetVas);
        for (const targetVAS of targetVASs) {
            const { issue } = worksheetDetails.find((wsd) => wsd.targetVas.id === targetVAS.id);
            if (targetVAS.operationGuide && !issue) {
                await this.doOperationTransaction(targetVAS);
            }
        }
        worksheet = await this.completWorksheet(worksheet, sales_base_1.ORDER_STATUS.DONE);
        return worksheet;
    }
    async doOperationTransaction(targetVAS) {
        var _a;
        const operationGuide = (_a = targetVAS.vas) === null || _a === void 0 ? void 0 : _a.operationGuide;
        if (operationGuide) {
            await this.COMPLETE_TRX_MAP[operationGuide](this.trxMgr, targetVAS, this.user);
        }
    }
}
exports.VasWorksheetController = VasWorksheetController;
//# sourceMappingURL=vas-worksheet-controller.js.map