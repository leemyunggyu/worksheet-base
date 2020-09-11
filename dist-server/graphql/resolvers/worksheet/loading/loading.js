"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_base_1 = require("@things-factory/sales-base");
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.loadingResolver = {
    async loading(_, { worksheetDetails, releaseGoodNo, orderInfo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await loading(trxMgr, domain, user, worksheetDetails, releaseGoodNo);
        });
    }
};
async function loading(trxMgr, domain, user, releaseGoodNo, worksheetDetails) {
    const worksheetController = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    await worksheetController.loading(releaseGoodNo, worksheetDetails);
    const releaseGood = await worksheetController.findRefOrder(sales_base_1.ReleaseGood, { domain: this.domain, name: releaseGoodNo }, ['orderInventories']);
    const targetInventories = releaseGood.orderInventories.filter((orderInventory) => (orderInventory.status = sales_base_1.ORDER_INVENTORY_STATUS.LOADED));
    await sales_base_1.generateDeliveryOrder(worksheetDetails, targetInventories, releaseGood.bizplace, releaseGood, domain, user, trxMgr);
}
exports.loading = loading;
//# sourceMappingURL=loading.js.map