"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers/");
exports.generateReleaseGoodWorksheetResolver = {
    async generateReleaseGoodWorksheet(_, { releaseGoodNo }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            return await generatePickingWorksheet(trxMgr, domain, user, releaseGoodNo);
        });
    }
};
async function generatePickingWorksheet(trxMgr, domain, user, releaseGoodNo) {
    const worksheetController = new controllers_1.PickingWorksheetController(trxMgr, domain, user);
    return await worksheetController.generatePickingWorksheet(releaseGoodNo);
}
exports.generatePickingWorksheet = generatePickingWorksheet;
//# sourceMappingURL=generate-release-good-worksheet.js.map