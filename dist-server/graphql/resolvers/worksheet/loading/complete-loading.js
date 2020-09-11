"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
exports.completeLoadingResolver = {
    async completeLoading(_, { releaseGoodNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completeLoading(trxMgr, domain, user, releaseGoodNo);
        });
    }
};
async function completeLoading(trxMgr, domain, user, releaseGoodNo) {
    const worksheetController = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    const releaseGood = await worksheetController.findRefOrder(sales_base_1.ReleaseGood, {
        domain,
        name: releaseGoodNo,
        status: sales_base_1.ORDER_STATUS.LOADING
    });
    const worksheet = await worksheetController.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.LOADING, [
        'worksheetDetails',
        'worksheetDetails.targetInventory'
    ]);
    const worksheetDetails = worksheet.worksheetDetails;
    const targetInventories = worksheetDetails.map((wsd) => wsd.targetInventory);
    const remainInventories = targetInventories.filter((targetInventory) => targetInventory.status === sales_base_1.ORDER_INVENTORY_STATUS.LOADED);
    await worksheetController.completeLoading(releaseGoodNo);
    if (remainInventories.length) {
        await createReturnWorksheet(trxMgr, domain, user, releaseGoodNo, remainInventories);
    }
}
exports.completeLoading = completeLoading;
// Generating worksheet for returning process
async function createReturnWorksheet(trxMgr, domain, user, releaseGoodNo, orderInventories) {
    const worksheetController = new controllers_1.ReturningWorksheetController(trxMgr, domain, user);
    return await worksheetController.generateReturningWorksheet(releaseGoodNo, orderInventories);
}
exports.createReturnWorksheet = createReturnWorksheet;
//# sourceMappingURL=complete-loading.js.map