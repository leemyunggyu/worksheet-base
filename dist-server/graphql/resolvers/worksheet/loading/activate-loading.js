"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const entities_1 = require("../../../../entities");
exports.activateLoadingResolver = {
    async activateLoading(_, { worksheetNo, loadingWorksheetDetails }, context) {
        return typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            const foundWorksheet = await trxMgr.getRepository(entities_1.Worksheet).findOne({
                where: {
                    domain,
                    name: worksheetNo,
                    status: constants_1.WORKSHEET_STATUS.DEACTIVATED,
                    type: constants_1.WORKSHEET_TYPE.LOADING
                },
                relations: ['bizplace', 'releaseGood', 'worksheetDetails', 'worksheetDetails.targetInventory']
            });
            if (!foundWorksheet)
                throw new Error(`Worksheet doesn't exists`);
            const relatedWorksheetCnt = await trxMgr.getRepository(entities_1.Worksheet).count({
                where: {
                    domain,
                    releaseGood: foundWorksheet.releaseGood,
                    type: constants_1.WORKSHEET_TYPE.VAS,
                    status: typeorm_1.Not(typeorm_1.Equal(constants_1.WORKSHEET_STATUS.DONE))
                }
            });
            // Stop to activate loading worksheet with Exception
            // This resolver is being called from client side not from other resolver.
            // So if there's a related worksheet, it should throw an Error to inform user about non-finished order.
            if (relatedWorksheetCnt) {
                throw new Error(`Related VAS order with RO: ${foundWorksheet.releaseGood.name} is still under processing.`);
            }
            return await activateLoading(trxMgr, domain, user, worksheetNo, loadingWorksheetDetails);
        });
    }
};
async function activateLoading(trxMgr, domain, user, worksheetNo, loadingWorksheetDetails) {
    const worksheetController = new controllers_1.LoadingWorksheetController(trxMgr, domain, user);
    return await worksheetController.activateLoading(worksheetNo, loadingWorksheetDetails);
}
exports.activateLoading = activateLoading;
//# sourceMappingURL=activate-loading.js.map