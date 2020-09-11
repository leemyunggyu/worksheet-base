"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.activateVasResolver = {
    async activateVas(_, { worksheetNo, vasWorksheetDetails }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.swtate;
            return await activateVas(trxMgr, domain, user, worksheetNo, vasWorksheetDetails);
        });
    }
};
async function activateVas(trxMgr, domain, user, worksheetNo, vasWorksheetDetails) {
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    return await worksheetController.activateVAS(worksheetNo, vasWorksheetDetails);
}
exports.activateVas = activateVas;
//# sourceMappingURL=activate-vas.js.map