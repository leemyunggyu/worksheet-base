"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const biz_base_1 = require("@things-factory/biz-base");
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers/");
const worksheet_controller_1 = require("../../../../controllers/worksheet-controller");
exports.completePickingResolver = {
    async completePicking(_, { releaseGoodNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await completePicking(trxMgr, domain, user, releaseGoodNo);
            const bizplace = await biz_base_1.getMyBizplace(user);
            const worksheetController = new worksheet_controller_1.WorksheetController(trxMgr, domain, user);
            await worksheetController.notifyToCustomer(bizplace, {
                title: `Picking has been completed`,
                message: `Items now are ready to be loaded`,
                url: context.header.referer
            });
        });
    }
};
async function completePicking(trxMgr, domain, user, releaseGoodNo) {
    var _a;
    const pickingWSCtrl = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    const releaseGood = await pickingWSCtrl.findRefOrder(sales_base_1.ReleaseGood, {
        domain,
        name: releaseGoodNo
    });
    const worksheet = await pickingWSCtrl.findWorksheetByRefOrder(releaseGood, constants_1.WORKSHEET_TYPE.PICKING, [
        'worksheetDetails',
        'worksheetDetails.targetInventories'
    ]);
    const worksheetDetails = worksheet.worksheetDetails;
    const pickedTargetInventories = worksheetDetails.map((wsd) => wsd.targetInventory.status === sales_base_1.ORDER_INVENTORY_STATUS.PICKED);
    await pickingWSCtrl.completePicking(releaseGoodNo);
    const loadingWSCtrl = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    let loadingWorksheet = await loadingWSCtrl.generateLoadingWorksheet(releaseGoodNo, pickedTargetInventories);
    if (!((_a = loadingWorksheet.worksheetDetails) === null || _a === void 0 ? void 0 : _a.length)) {
        loadingWorksheet = await pickingWSCtrl.findWorksheetById(loadingWorksheet.id);
    }
    const loadingWorksheetDetails = loadingWorksheet.worksheetDetails;
    await loadingWSCtrl.activateLoading(loadingWorksheet.name, loadingWorksheetDetails);
}
exports.completePicking = completePicking;
//# sourceMappingURL=complete-picking.js.map