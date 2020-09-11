"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoVasResolver = {
    async undoVas(_, { worksheetDetail }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoVas(trxMgr, domain, user, worksheetDetail);
        });
    }
};
async function undoVas(trxMgr, domain, user, worksheetDetail) {
    const worksheetController = new controllers_1.VasWorksheetController(trxMgr, domain, user);
    await worksheetController.undoVAS(worksheetDetail);
}
exports.undoVas = undoVas;
//# sourceMappingURL=undo-vas.js.map