"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const biz_base_1 = require("@things-factory/biz-base");
const typeorm_1 = require("typeorm");
const entities_1 = require("../../../entities");
exports.deleteWorksheetDetail = {
    async deleteWorksheetDetail(_, { id }, context) {
        await typeorm_1.getRepository(entities_1.WorksheetDetail).delete({
            domain: context.state.domain,
            bizplace: typeorm_1.In(await biz_base_1.getPermittedBizplaceIds(context.state.domain, context.state.user)),
            id
        });
        return true;
    }
};
//# sourceMappingURL=delete-worksheet-detail.js.map