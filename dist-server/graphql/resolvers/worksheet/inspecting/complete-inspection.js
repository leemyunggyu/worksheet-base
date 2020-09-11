"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../../constants");
const controllers_1 = require("../../../../controllers");
const worksheet_controller_1 = require("../../../../controllers/worksheet-controller");
exports.completeInspectionResolver = {
    async completeInspection(_, { inventoryCheckNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            const worksheet = await completeCycleCount(trxMgr, domain, user, inventoryCheckNo);
            const message = worksheet.status === constants_1.WORKSHEET_STATUS.DONE
                ? `Inventories are checked successfully.`
                : `There are inventories needed to be reviewed. `;
            const worksheetController = new worksheet_controller_1.WorksheetController(trxMgr, domain, user);
            await worksheetController.notifyToOfficeAdmin({
                title: `Inventory check has been completed`,
                message,
                url: context.header.referer
            });
        });
    }
};
async function completeCycleCount(trxMgr, domain, user, inventoryCheckNo) {
    const worksheetController = new controllers_1.CycleCountWorksheetController(trxMgr, domain, user);
    return await worksheetController.completeCycleCount(inventoryCheckNo);
}
exports.completeCycleCount = completeCycleCount;
//# sourceMappingURL=complete-inspection.js.map