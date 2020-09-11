"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_base_1 = require("@things-factory/auth-base");
const biz_base_1 = require("@things-factory/biz-base");
const sales_base_1 = require("@things-factory/sales-base");
const shell_1 = require("@things-factory/shell");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../constants");
const entities_1 = require("../entities");
const utils_1 = require("../utils");
var ReferenceOrderFields;
(function (ReferenceOrderFields) {
    ReferenceOrderFields["ArrivalNotice"] = "arrivalNotice";
    ReferenceOrderFields["ReleaseGood"] = "releaseGood";
    ReferenceOrderFields["VasOrder"] = "vasOrder";
})(ReferenceOrderFields = exports.ReferenceOrderFields || (exports.ReferenceOrderFields = {}));
var OrderTargetFields;
(function (OrderTargetFields) {
    OrderTargetFields["OrderProduct"] = "targetProduct";
    OrderTargetFields["OrderInventory"] = "targetInventory";
    OrderTargetFields["OrderVas"] = "targetVas";
})(OrderTargetFields = exports.OrderTargetFields || (exports.OrderTargetFields = {}));
class WorksheetController {
    constructor(trxMgr, domain, user) {
        this.ERROR_MSG = {
            FIND: {
                NO_RESULT: (condition) => `There's no results matched with condition ${condition}`
            },
            CREATE: {
                ID_EXISTS: 'Target has ID already',
                EMPTY_CREATOR: 'Cannot create without creator',
                EMPTY_UPDATER: 'Cannot create without updater'
            },
            UPDATE: {
                ID_NOT_EXISTS: `Target doesn't have ID`,
                EMPTY_UPDATER: 'Cannot update without updater'
            },
            VALIDITY: {
                UNEXPECTED_FIELD_VALUE: (field, expectedValue, actualValue) => `Expected ${field} value is ${expectedValue} but got ${actualValue}`,
                DUPLICATED: (field, value) => `There is duplicated ${field} value (${value})`,
                CANT_PROCEED_STEP_BY: (step, reason) => `Can't proceed to ${step} it because ${reason}`
            }
        };
        this.ROLE_NAMES = {
            OFFICE_ADMIN: 'Office Admin'
        };
        this.trxMgr = trxMgr;
        this.domain = domain;
        this.user = user;
    }
    getRefOrderField(refOrder) {
        if (refOrder instanceof sales_base_1.ArrivalNotice) {
            return ReferenceOrderFields.ArrivalNotice;
        }
        else if (refOrder instanceof sales_base_1.ReleaseGood) {
            return ReferenceOrderFields.ReleaseGood;
        }
        else if (refOrder instanceof sales_base_1.VasOrder) {
            return ReferenceOrderFields.VasOrder;
        }
        else {
            throw new Error(this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE('refOrder', 'One of referece order type', refOrder));
        }
    }
    getOrderTargetField(orderTarget) {
        if (orderTarget instanceof sales_base_1.OrderProduct) {
            return OrderTargetFields.OrderProduct;
        }
        else if (orderTarget instanceof sales_base_1.OrderInventory) {
            return OrderTargetFields.OrderInventory;
        }
        else if (orderTarget instanceof sales_base_1.OrderVas) {
            return OrderTargetFields.OrderVas;
        }
        else {
            this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE('orderTarget', 'One of order target type', orderTarget);
        }
    }
    /**
     * @summary Find reference order (ArrivalNotice, ReleaseGood, VasOrder, etc...)
     * @description
     * Find and return reference order with its relations based on passed condition & reltaions
     */
    async findRefOrder(entitySchema, condition, relations) {
        var _a;
        condition = this.tidyConditions(condition);
        let findOption = { where: condition };
        if (((_a = relations) === null || _a === void 0 ? void 0 : _a.length) > 0)
            findOption.relations = relations;
        const refOrder = await this.trxMgr.getRepository(entitySchema).findOne(findOption);
        if (!refOrder)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(findOption));
        return refOrder;
    }
    /**
     * @summary find worksheet by passed condition
     * @description find worksheey based on passed condition
     * It will return worksheetDetail as its relation by default
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheet(condition, ['arrivalNotice', 'releaseGood'])
     */
    async findWorksheet(condition, relations = ['worksheetDetails']) {
        condition = this.tidyConditions(condition);
        const worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).findOne({
            where: Object.assign({ domain: this.domain }, condition),
            relations
        });
        if (!worksheet)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(condition));
        return worksheet;
    }
    /**
     * @summary Find worksheet by passed params
     * @description Find and return worksheet based on passed ID
     * It will return worksheetDetail as its relation by default
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheetById(id, ['arrivalNotice', 'releaseGood'])
     */
    async findWorksheetById(id, relations = ['worksheetDetails']) {
        const worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).findOne(id, { relations });
        if (!worksheet)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(id));
        return worksheet;
    }
    /**
     * @summary Find worksheet by passed params
     * @description Find and return worksheet based on worksheet no
     * It will return worksheetDetail as its relation by default
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheetByNo(worksheetNo, ['arrivalNotice', 'releaseGood'])
     */
    async findWorksheetByNo(worksheetNo, relations = ['worksheetDetails']) {
        const worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).findOne({
            where: { domain: this.domain, name: worksheetNo },
            relations
        });
        if (!worksheet)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(worksheetNo));
        return worksheet;
    }
    /**
     * @summary Find worksheet by passed params.
     * @description Find and return worksheet based on worksheet no
     * It will return worksheetDetail as its relation by default
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheetByNo(worksheetNo, ['arrivalNotice', 'releaseGood'])
     */
    async findWorksheetByRefOrder(refOrder, type, relations = ['worksheetDetails']) {
        var _a;
        const refOrderField = this.getRefOrderField(refOrder);
        if (!((_a = refOrder.bizplace) === null || _a === void 0 ? void 0 : _a.id)) {
            switch (refOrderField) {
                case ReferenceOrderFields.ArrivalNotice:
                    refOrder = await this.findRefOrder(sales_base_1.ArrivalNotice, refOrder, ['bizplace']);
                    break;
                case ReferenceOrderFields.ReleaseGood:
                    refOrder = await this.findRefOrder(sales_base_1.ReleaseGood, refOrder, ['bizplace']);
                    break;
                case ReferenceOrderFields.VasOrder:
                    refOrder = await this.findRefOrder(sales_base_1.VasOrder, refOrder, ['bizplace']);
                    break;
            }
        }
        const bizplace = refOrder.bizplace;
        const condition = {
            where: {
                bizplace,
                domain: this.domain,
                type,
                [refOrderField]: refOrder
            },
            relations
        };
        const worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).findOne(condition);
        if (!worksheet)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(type));
        return worksheet;
    }
    /**
     * @summary Find activatable worksheet by worksheet no and type
     * @description Find worksheet by passed worksheet no
     * and check validity by passed type and status (DEACTIVATED)
     * It will return worksheetDetail as its relation by default
     * If you want to get additional relations you need to define reltaions
     * ex) findActivatableWorksheet(worksheetNo, type, ['arrivalNotice])
     */
    async findActivatableWorksheet(worksheetNo, type, relations = ['worksheetDetails']) {
        const worksheet = await this.findWorksheetByNo(worksheetNo, relations);
        this.checkRecordValidity(worksheet, { type, status: constants_1.WORKSHEET_STATUS.DEACTIVATED });
        return worksheet;
    }
    /**
     * @summary find worksheet detail by passed condition
     * @description find worksheey based on passed condition
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheetDetail(condition, ['worksheet'])
     */
    async findWorksheetDetail(condition, relations) {
        condition = this.tidyConditions(condition);
        const worksheetDetail = await this.trxMgr.getRepository(entities_1.WorksheetDetail).findOne({
            where: Object.assign({ domain: this.domain }, condition),
            relations
        });
        if (!worksheetDetail)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(condition));
        return worksheetDetail;
    }
    /**
     * @summary find worksheet detail by passed worksheet detail name
     * @description find worksheey based on passed name of worksheet detail
     * If you want to get additional relations you need to define reltaions
     * ex) findWorksheetDetail(condition, ['worksheet'])
     */
    async findWorksheetDetailByName(worksheetDetailName, relations) {
        const worksheetDetail = await this.trxMgr.getRepository(entities_1.WorksheetDetail).findOne({
            where: { domain: this.domain, name: worksheetDetailName },
            relations
        });
        if (!worksheetDetail)
            throw new Error(this.ERROR_MSG.FIND.NO_RESULT(worksheetDetailName));
        return worksheetDetail;
    }
    /**
     * @summary Find executable worksheet detail by its name
     * @description Find worksheet detail by passwd worksheet detail name
     * and check validity by passed type and status (EXECUTING)
     * If you want to get additional relations you need to define relations
     * ex) findExecutableWorksheetDetailByName(worksheetDetailName, type, ['arrivalNotice'])
     */
    async findExecutableWorksheetDetailByName(worksheetDetailName, type, relations = []) {
        const worksheetDetail = await this.findWorksheetDetailByName(worksheetDetailName, relations);
        this.checkRecordValidity(worksheetDetail, { type, status: constants_1.WORKSHEET_STATUS.EXECUTING });
        return worksheetDetail;
    }
    /**
     * @summary Creating worksheet
     * @description creating worksheet by passed params
     * It will set status as DEACTIVATED by default
     * If you want to define status by yourself, need to pass status in additionalProps
     * ex) createWorksheet(refOrder, type, { status: WORKSHEET_STATUS.ACTIVATED })
     */
    async createWorksheet(refOrder, type, additionalProps = {}) {
        let refOrderType = this.getRefOrderField(refOrder);
        const bizplace = await this.extractBizplaceFromRefOrder(refOrder);
        const worksheet = Object.assign({ domain: this.domain, bizplace, name: utils_1.WorksheetNoGenerator.generate(type), type, status: constants_1.WORKSHEET_STATUS.DEACTIVATED, creator: this.user, updater: this.user, [refOrderType]: refOrder }, additionalProps);
        if (worksheet.id)
            throw new Error(this.ERROR_MSG.CREATE.ID_EXISTS);
        return await this.trxMgr.getRepository(entities_1.Worksheet).save(worksheet);
    }
    /**
     * @summary Creating worksheet details
     * @description creating worksheet details by passed params
     * It will set status as DEACTIVATED by default
     * If you want to define status by yourself, need to pass status in additionalProps
     * ex) createWorksheetDetails(refOrder, type, { status: WORKSHEET_STATUS.ACTIVATED })
     *
     */
    async createWorksheetDetails(worksheet, type, orderTargets, additionalProps = {}) {
        var _a;
        if (!((_a = worksheet.bizplace) === null || _a === void 0 ? void 0 : _a.id))
            await this.findWorksheetById(worksheet.id, ['bizplace']);
        const bizplace = worksheet.bizplace;
        const worksheetDetails = orderTargets.map((orderTarget) => {
            const orderTargetField = this.getOrderTargetField(orderTarget);
            return Object.assign({ domain: this.domain, bizplace,
                worksheet, name: utils_1.WorksheetNoGenerator.generate(type, true), type, status: constants_1.WORKSHEET_STATUS.DEACTIVATED, [orderTargetField]: orderTarget, creator: this.user, updater: this.user }, additionalProps);
        });
        if (worksheetDetails.some((wsd) => wsd.id))
            throw new Error(this.ERROR_MSG.CREATE.ID_EXISTS);
        return await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetails);
    }
    /**
     * @summary Update reference order (ArrivalNotice, ReleaseGood, VasOrder, InventoryCheck)
     * @description
     * Update reference order like (ArrivalNotice, ReleaseGood, VasOrder, InventoryCheck)
     */
    async updateRefOrder(refOrder, entitySchema) {
        var _a;
        if (!entitySchema) {
            if (refOrder instanceof sales_base_1.ArrivalNotice) {
                entitySchema = sales_base_1.ArrivalNotice;
            }
            else if (refOrder instanceof sales_base_1.ReleaseGood) {
                entitySchema = sales_base_1.ReleaseGood;
            }
            else if (refOrder instanceof sales_base_1.VasOrder) {
                entitySchema = sales_base_1.VasOrder;
            }
            else if (refOrder instanceof sales_base_1.InventoryCheck) {
                entitySchema = sales_base_1.InventoryCheck;
            }
        }
        if (!refOrder.id)
            throw new Error(this.ERROR_MSG.UPDATE.ID_NOT_EXISTS);
        if (!((_a = refOrder.updater) === null || _a === void 0 ? void 0 : _a.id))
            refOrder = this.setStamp(refOrder);
        return await this.trxMgr.getRepository(entitySchema).save(refOrder);
    }
    /**
     * @summary Update order targets (OrderProduct, OrderInventory, OrderVas)
     * @description
     * Update order targets like (OrderProduct, OrderInventory, OrderVas)
     */
    async updateOrderTargets(orderTargets, entitySchema) {
        if (!entitySchema) {
            if (orderTargets[0] instanceof sales_base_1.OrderProduct) {
                entitySchema = sales_base_1.OrderProduct;
            }
            else if (orderTargets[0] instanceof sales_base_1.OrderInventory) {
                entitySchema = sales_base_1.OrderInventory;
            }
            else if (orderTargets[0] instanceof sales_base_1.OrderVas) {
                entitySchema = sales_base_1.OrderVas;
            }
        }
        if (orderTargets.some((orderTarget) => !orderTarget.id))
            throw new Error(this.ERROR_MSG.UPDATE.ID_NOT_EXISTS);
        orderTargets.forEach((orderTarget) => {
            var _a;
            if (!((_a = orderTarget.updater) === null || _a === void 0 ? void 0 : _a.id))
                orderTarget = this.setStamp(orderTarget);
        });
        return await this.trxMgr.getRepository(entitySchema).save(orderTargets);
    }
    /**
     * @summary generate worksheet and worksheet details
     * @description It will generate worksheet and worksheet details in onetime
     * Step 1. Call createWorksheet to create worksheet
     *  The status of worksheet will be DEACTIVATED by default
     *  You can change it through passing additionalProps
     * Step 2. Update status of order targets
     *  Beacuse its status can be different based on type of worksheet
     * Step 3. Call createWorksheetDetails to create worksheet details
     * Step 4. Call updateRefOrder to change status of reference order
     */
    async generateWorksheet(worksheetType, refOrder, orderTargets, refOrderStatus, orderTargetStatus, additionalProps = {}) {
        const worksheet = await this.createWorksheet(refOrder, worksheetType, additionalProps);
        orderTargets.forEach((orderTarget) => {
            orderTarget.status = orderTargetStatus;
        });
        orderTargets = await this.updateOrderTargets(orderTargets);
        worksheet.worksheetDetails = await this.createWorksheetDetails(worksheet, worksheetType, orderTargets);
        refOrder.status = refOrderStatus;
        await this.updateRefOrder(refOrder);
        return worksheet;
    }
    /**
     * @summary Activate worksheet
     * @description It will activate passed worksheet
     * Every passed worksheet and worksheet details should have value on its id field
     * Because this function has logic to update worksheet and worksheet details
     * Step 1. Check whether every passed worksheet and worksheet details has id
     * Step 2. Change worksheet properly and update it
     * Step 3. Change worksheet details properly and update it
     */
    async activateWorksheet(worksheet, worksheetDetails, changedWorksheetDetails) {
        if (!worksheet.id || worksheetDetails.some((wsd) => !wsd.id)) {
            throw new Error(this.ERROR_MSG.UPDATE.ID_NOT_EXISTS);
        }
        worksheet.status = constants_1.WORKSHEET_STATUS.EXECUTING;
        worksheet.startedAt = new Date();
        worksheet.updater = this.user;
        worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).save(worksheet);
        worksheetDetails = this.renewWorksheetDetails(worksheetDetails, changedWorksheetDetails, {
            status: constants_1.WORKSHEET_STATUS.EXECUTING,
            updater: this.user
        });
        worksheet.worksheetDetails = await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetails);
        return worksheet;
    }
    /**
     * @summary Complete worksheet
     * @description It will activate passed worksheet
     * Passed worksheet should have value on its id field
     * Because this function has logic to update worksheet
     * Step 1. Check whether passed worksheet has id
     * Step 2. Change worksheet properly and update it
     * Step 3. Renew worksheet with relations which is needed to complete worksheet
     * Step 4. Change order targets properly and update it based on type of worksheet
     * Step 5. If passed updatedRefOrderStatus has value it update reference order status
     */
    async completWorksheet(worksheet, updatedRefOrderStatus) {
        if (!worksheet.id)
            throw new Error(this.ERROR_MSG.UPDATE.ID_NOT_EXISTS);
        worksheet.status = constants_1.WORKSHEET_STATUS.DONE;
        worksheet.endedAt = new Date();
        worksheet.updater = this.user;
        worksheet = await this.trxMgr.getRepository(entities_1.Worksheet).save(worksheet);
        const worksheetType = worksheet.type;
        worksheet = await this.findWorksheet(worksheet, [
            'worksheetDetails',
            'worksheetDetails.targetProduct',
            'worksheetDetails.targetInventory',
            'worksheetDetails.targetVas'
        ]);
        const worksheetDetails = worksheet.worksheetDetails;
        worksheetDetails.forEach((wsd) => {
            wsd.status = constants_1.WORKSHEET_STATUS.DONE;
            wsd.updater = this.user;
        });
        await this.trxMgr.getRepository(entities_1.WorksheetDetail).save(worksheetDetails);
        if (worksheetType === constants_1.WORKSHEET_TYPE.UNLOADING) {
            const targetProducts = worksheet.worksheetDetails.map((wsd) => {
                let targetProduct = wsd.targetProduct;
                targetProduct.status = sales_base_1.ORDER_PRODUCT_STATUS.TERMINATED;
                targetProduct.updater = this.user;
                return targetProduct;
            });
            await this.updateOrderTargets(targetProducts);
        }
        else if (worksheetType === constants_1.WORKSHEET_TYPE.VAS) {
            const targetVASs = worksheet.worksheetDetails.map((wsd) => {
                let targetVAS = wsd.targetVas;
                targetVAS.status = sales_base_1.ORDER_VAS_STATUS.TERMINATED;
                targetVAS.updater = this.user;
                return targetVAS;
            });
            await this.updateOrderTargets(targetVASs);
        }
        else if (worksheetType === constants_1.WORKSHEET_TYPE.PUTAWAY ||
            worksheetType === constants_1.WORKSHEET_TYPE.PICKING ||
            worksheetType === constants_1.WORKSHEET_TYPE.LOADING ||
            worksheetType === constants_1.WORKSHEET_TYPE.RETURN) {
            const targetInventories = worksheet.worksheetDetails.map((wsd) => {
                let targetInventory = wsd.targetInventory;
                targetInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.TERMINATED;
                targetInventory.updater = this.user;
                return targetInventory;
            });
            await this.updateOrderTargets(targetInventories);
        }
        if (updatedRefOrderStatus) {
            const refOrder = await this.extractRefOrderFromWorksheet(worksheet);
            refOrder.status = updatedRefOrderStatus;
            refOrder.updater = this.user;
            await this.updateRefOrder(refOrder);
        }
        return worksheet;
    }
    /**
     * @summary Renew worksheet details by changed worksheet details
     * @description When you want to merge changed worksheet detail list into original worksheet detail list
     * you can use this function
     * it will loop through whole passed original worksheet details and find out matched changed one by value of 'ID' or its 'name'
     * Because of this, every passed origin worksheet details and changed worksheet details should have one of those values
     */
    renewWorksheetDetails(originWSDs, changedWSDs, additionalProps = {}) {
        if (originWSDs.some((wsd) => !wsd.id && !wsd.name) ||
            changedWSDs.some((wsd) => !wsd.id && !wsd.name)) {
            throw new Error(this.ERROR_MSG.VALIDITY.CANT_PROCEED_STEP_BY('renew worksheet details', `some passed parameter doesn't have id and name`));
        }
        return originWSDs.map((originWSD) => {
            const changedWSD = this.findMatchedWSD(originWSD.id || originWSD.name, changedWSDs);
            return Object.assign(Object.assign(Object.assign({}, originWSD), changedWSD), additionalProps);
        });
    }
    /**
     * @summary Find out matched worksheet detail by identifier
     * @description Find out matched worksheet detail by identifier
     * identifier can be 'ID' or 'name' of worksheet detail
     */
    findMatchedWSD(identifier, candidates) {
        return candidates.find((candidate) => candidate.id === identifier || candidate.name === identifier);
    }
    /**
     * @summary Valitiy checker
     * @description It will try to check whether passed record has same properties with passed conditions
     * Basically it will check equality of value
     * If you want to check advanced validation you can pass function to customize the logic of validation
     * Passed function will be call with actual value of record as parameter
     */
    checkRecordValidity(record, conditions) {
        for (let field in conditions) {
            let isValid = false;
            if (typeof conditions[field] === 'function') {
                isValid = conditions[field](record[field]);
            }
            else {
                isValid = conditions[field] === record[field];
            }
            if (!isValid)
                throw new Error(this.ERROR_MSG.VALIDITY.UNEXPECTED_FIELD_VALUE(field, conditions[field], record[field]));
        }
    }
    /**
     * @summary Notify to passed users
     * @description Passed notification message will be sent to passed users
     */
    notifyToUsers(users, message) {
        users.forEach((user) => {
            shell_1.sendNotification({
                receiver: user.id,
                message: JSON.stringify(message)
            });
        });
    }
    /**
     * @summary Notify to office admin
     * @description Passed notification message will be sent to office admin of current domain
     * default role name is defiend as ROLE_NAME.OFFICE_ADMIn by default
     * You can change role name by passing roleName as parameter
     */
    async notifyToOfficeAdmin(message, roleName) {
        const users = await this.trxMgr
            .getRepository('users_roles')
            .createQueryBuilder('ur')
            .select('ur.users_id', 'id')
            .where(qb => {
            const subQuery = qb
                .subQuery()
                .select('role.id')
                .from(auth_base_1.Role, 'role')
                .where('role.name = :roleName', { roleName: roleName || this.ROLE_NAMES.OFFICE_ADMIN })
                .andWhere('role.domain_id = :domainId', { domainId: this.domain.id })
                .getQuery();
            return 'ur.roles_id IN ' + subQuery;
        })
            .getRawMany();
        this.notifyToUsers(users, message);
    }
    /**
     * @summary Notify to customer of passed bizplace
     * @description Passed notification message will be sent to customer of passed bizplace
     */
    async notifyToCustomer(bizplace, message) {
        const users = await this.trxMgr
            .getRepository('bizplaces_users')
            .createQueryBuilder('bu')
            .select('bu.user_id', 'id')
            .where(qb => {
            const subQuery = qb
                .subQuery()
                .select('bizplace.id')
                .from(biz_base_1.Bizplace, 'bizplace')
                .where('bizplace.name = :bizplaceName', { bizplaceName: bizplace.name })
                .getQuery();
            return 'bu.bizplace_id IN ' + subQuery;
        })
            .getRawMany();
        this.notifyToUsers(users, message);
    }
    /**
     * @summary extract out referenc order from given worksheet
     * @description If it doesn't have any reference order
     * find worksheet with every possible reference order once again
     * and extract out reference order from found worksheet
     */
    async extractRefOrderFromWorksheet(worksheet) {
        let refOrder = worksheet.arrivalNotice || worksheet.releaseGood || worksheet.vasOrder || worksheet.inventoryCheck || null;
        if (!refOrder) {
            const wsWithRefOrd = await this.trxMgr.getRepository(entities_1.Worksheet).findOne(worksheet.id, {
                relations: ['arrivalNotice', 'releaseGood', 'vasOrder', 'inventoryCheck']
            });
            refOrder =
                wsWithRefOrd.arrivalNotice ||
                    wsWithRefOrd.releaseGood ||
                    wsWithRefOrd.vasOrder ||
                    wsWithRefOrd.inventoryCheck ||
                    null;
            if (!refOrder)
                throw new Error(this.ERROR_MSG.FIND.NO_RESULT(worksheet.id));
        }
        return refOrder;
    }
    /**
     * @summary Check whether passed pallet is existing alreay
     * @description It will try to count inventories which has same domain and same pallet Id and not terminated one
     * If there's positive result it will throw an error cause pallet is duplicated
     */
    async checkPalletDuplication(palletId) {
        const duplicatedPalletCnt = await this.trxMgr.getRepository(warehouse_base_1.Inventory).count({
            domain: this.domain,
            palletId,
            status: typeorm_1.Not(typeorm_1.Equal(warehouse_base_1.INVENTORY_STATUS.TERMINATED))
        });
        if (duplicatedPalletCnt)
            throw new Error(this.ERROR_MSG.VALIDITY.DUPLICATED('Pallet ID', palletId));
    }
    async createInventory(inventory) {
        inventory = this.setStamp(inventory);
        return await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventory);
    }
    /**
     * @summary Update inventory record
     * @description It will update inventory after set a stamp (domain, updater)
     * The special point of this function is that this changes won't generate inventory history
     * If you want to generate inventory history automatically you would better to use transactionInventory function
     */
    async updateInventory(inventory) {
        if (!inventory.id)
            throw new Error(this.ERROR_MSG.UPDATE.ID_NOT_EXISTS);
        inventory = this.setStamp(inventory);
        return await this.trxMgr.getRepository(warehouse_base_1.Inventory).save(inventory);
    }
    /**
     * @summary Do transaction on inventory record
     * @description It will update inventory after set a temp (domain, updater)
     * and then generate inventory history based on current changes
     */
    async transactionInventory(inventory, referencOrder, changedQty, changedWeight, transactionType) {
        if (inventory.id) {
            inventory = await this.updateInventory(inventory);
        }
        else {
            inventory = await this.createInventory(inventory);
        }
        utils_1.generateInventoryHistory(inventory, referencOrder, transactionType, changedQty, changedWeight, this.user, this.trxMgr);
        return inventory;
    }
    /**
     * @summary set common stamp like domain, creator, updater
     * @description Set common stamp to passed record
     * If it doesn't have id it will handle it as creating one
     * If it has id it will handle it as updating one
     */
    setStamp(record) {
        if (!record.domain)
            record.domain = this.domain;
        if (!record.id && !record.creator)
            record.creator = this.user;
        if (!record.updater)
            record.updater = this.user;
        return record;
    }
    /**
     * @summary Extract bizplace from reference order
     * @description It will find reference order with bizplace and return only bizplace to extract it out
     */
    async extractBizplaceFromRefOrder(refOrder, entitySchema) {
        if (!entitySchema) {
            if (refOrder instanceof sales_base_1.ArrivalNotice) {
                entitySchema = sales_base_1.ArrivalNotice;
            }
            else if (refOrder instanceof sales_base_1.ReleaseGood) {
                entitySchema = sales_base_1.ReleaseGood;
            }
            else if (refOrder instanceof sales_base_1.VasOrder) {
                entitySchema = sales_base_1.VasOrder;
            }
            else if (refOrder instanceof sales_base_1.InventoryCheck) {
                entitySchema = sales_base_1.InventoryCheck;
            }
        }
        const { bizplace } = await this.findRefOrder(entitySchema, refOrder, ['bizplace']);
        return bizplace;
    }
    tidyConditions(record) {
        Object.keys(record).forEach((key) => {
            if (record[key] === null || record[key] instanceof Date)
                delete record[key];
        });
        return record;
    }
}
exports.WorksheetController = WorksheetController;
//# sourceMappingURL=worksheet-controller.js.map