"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
exports.completeVasResolver = {
    async completeVas(_, { orderNo, orderType }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completeVAS(trxMgr, domain, user, orderNo, orderType);
        });
    }
};
async function completeVAS(trxMgr, domain, user, orderNo, orderType) {
    var _a, _b, _c, _d;
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    let worksheet = await worksheetController.completeVAS(orderNo, orderType);
    if (orderType === sales_base_1.ORDER_TYPES.ARRIVAL_NOTICE) {
        if (!((_a = worksheet.worksheetDetails) === null || _a === void 0 ? void 0 : _a.length) || !((_b = worksheet.arrivalNotice) === null || _b === void 0 ? void 0 : _b.id)) {
            worksheet = await worksheetController.findWorksheetById(worksheet.id, ['worksheetDetails', 'arrivalNotice']);
        }
        const arrivalNotice = worksheet.arrivalNotice;
        await activatePutawayWorksheet(trxMgr, domain, user, arrivalNotice);
    }
    else if (orderType === sales_base_1.ORDER_TYPES.RELEASE_OF_GOODS) {
        if (!((_c = worksheet.worksheetDetails) === null || _c === void 0 ? void 0 : _c.length) || !((_d = worksheet.releaseGood) === null || _d === void 0 ? void 0 : _d.id)) {
            worksheet = await worksheetController.findWorksheetById(worksheet.id, ['worksheetDetails', 'releaseGood']);
        }
        const releaseGood = worksheet.releaseGood;
        await activateLoadingWorksheet(trxMgr, domain, user, releaseGood);
    }
    return worksheet;
}
exports.completeVAS = completeVAS;
async function activatePutawayWorksheet(trxMgr, domain, user, arrivalNotice) {
    const worksheetController = new controllers_1.PutawayWorksheetController(trxMgr, domain, user);
    const worksheet = await worksheetController.findWorksheetByRefOrder(arrivalNotice, constants_1.WORKSHEET_TYPE.PUTAWAY);
    const worksheetNo = worksheet.name;
    const putawayWorksheetDetails = worksheet.worksheetDetails;
    await worksheetController.activatePutaway(worksheetNo, putawayWorksheetDetails);
}
async function activateLoadingWorksheet(trxMgr, domain, user, releaseGood) {
    const worksheetController = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    const worksheet = await worksheetController.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.LOADING);
    const worksheetNo = worksheet.name;
    const loadingWorksheetDetails = worksheet.worksheetDetails;
    await worksheetController.activateLoading(worksheetNo, loadingWorksheetDetails);
}
//# sourceMappingURL=complete-vas.js.map