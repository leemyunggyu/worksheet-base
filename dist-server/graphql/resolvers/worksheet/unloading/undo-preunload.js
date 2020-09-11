"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const controllers_1 = require("../../../../controllers");
exports.undoPreunloadResolver = {
    async undoPreunload(_, { worksheetDetailName }, context) {
        return await typeorm_1.getManager().transaction(async (trxMgr) => {
            const { domain, user } = context.state;
            await undoPreunload(trxMgr, domain, user, worksheetDetailName);
        });
    }
};
async function undoPreunload(trxMgr, domain, user, worksheetDetailName) {
    const worksheetController = new controllers_1.UnloadingWorksheetController(trxMgr, domain, user);
    await worksheetController.undoPreunload(worksheetDetailName);
}
exports.undoPreunload = undoPreunload;
//# sourceMappingURL=undo-preunload.js.map