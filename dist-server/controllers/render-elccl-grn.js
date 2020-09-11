"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const attachment_base_1 = require("@things-factory/attachment-base");
const biz_base_1 = require("@things-factory/biz-base");
const env_1 = require("@things-factory/env");
const sales_base_1 = require("@things-factory/sales-base");
const warehouse_base_1 = require("@things-factory/warehouse-base");
const shell_1 = require("@things-factory/shell");
const form_data_1 = __importDefault(require("form-data"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const typeorm_1 = require("typeorm");
const constants_1 = require("../constants");
const entities_1 = require("../entities");
const datetime_util_1 = require("../utils/datetime-util");
const REPORT_API_URL = env_1.config.get('reportApiUrl', 'http://localhost:8888/rest/report/show_html');
async function renderElcclGRN({ domain: domainName, grnNo }) {
    var _a, _b, _c;
    // 1. find domain
    const domain = await typeorm_1.getRepository(shell_1.Domain).findOne({
        where: { subdomain: domainName }
    });
    // 2. find grn
    const foundGRN = await typeorm_1.getRepository(sales_base_1.GoodsReceivalNote).findOne({
        where: { domain, name: grnNo },
        relations: ['domain', 'bizplace', 'arrivalNotice']
    });
    // 3. find GAN
    const foundGAN = foundGRN.arrivalNotice;
    const ownRefNo = foundGAN.refNo;
    // 4. find customer bizplace
    const partnerBiz = foundGRN.bizplace;
    // 5. find domain bizplace id
    const foundDomainBizId = await typeorm_1.getRepository(biz_base_1.Partner).findOne({
        where: { partnerBizplace: partnerBiz.id },
        relations: ['domainBizplace']
    });
    // 6. found domain bizplace object
    const foundDomainBiz = await typeorm_1.getRepository(biz_base_1.Bizplace).findOne({
        where: { id: foundDomainBizId.domainBizplace.id }
    });
    // 7. find domain contact point
    const foundCP = await typeorm_1.getRepository(biz_base_1.ContactPoint).findOne({
        where: { domain, bizplace: foundDomainBiz }
    });
    // 8. find unloading worksheet
    const foundWS = await typeorm_1.getRepository(entities_1.Worksheet).findOne({
        where: { domain, arrivalNotice: foundGAN, type: sales_base_1.ORDER_PRODUCT_STATUS.UNLOADING, status: sales_base_1.ORDER_STATUS.DONE },
        relations: ['worksheetDetails']
    });
    // const targetProducts: OrderProduct[] = await getRepository(OrderProduct).find({
    //   where: { domain, arrivalNotice: foundGAN, actualPalletQty: Not(IsNull()), actualPackQty: Not(IsNull()) },
    //   relations: ['product']
    // })
    // 9. find grn template based on category
    const foundTemplate = await typeorm_1.getRepository(attachment_base_1.Attachment).findOne({
        where: { domain, category: constants_1.TEMPLATE_TYPE.GRN_TEMPLATE }
    });
    // 10. find grn logo
    const foundLogo = await typeorm_1.getRepository(attachment_base_1.Attachment).findOne({
        where: {
            domain,
            category: constants_1.TEMPLATE_TYPE.LOGO
        }
    });
    // 11. find signature
    const foundSignature = await typeorm_1.getRepository(attachment_base_1.Attachment).findOne({
        where: {
            domain,
            category: constants_1.TEMPLATE_TYPE.SIGNATURE
        }
    });
    const foundCop = await typeorm_1.getRepository(attachment_base_1.Attachment).findOne({
        where: {
            domain,
            category: constants_1.TEMPLATE_TYPE.COP
        }
    });
    const template = await attachment_base_1.STORAGE.readFile(foundTemplate.path, 'utf-8');
    let logo = null;
    if ((_a = foundLogo) === null || _a === void 0 ? void 0 : _a.path) {
        logo = 'data:' + foundLogo.mimetype + ';base64,' + (await attachment_base_1.STORAGE.readFile(foundLogo.path, 'base64'));
    }
    let signature = null;
    if ((_b = foundSignature) === null || _b === void 0 ? void 0 : _b.path) {
        signature = 'data:' + foundSignature.mimetype + ';base64,' + (await attachment_base_1.STORAGE.readFile(foundSignature.path, 'base64'));
    }
    let cop = null;
    if ((_c = foundCop) === null || _c === void 0 ? void 0 : _c.path) {
        cop = 'data:' + foundSignature.mimetype + ';base64,' + (await attachment_base_1.STORAGE.readFile(foundCop.path, 'base64'));
    }
    let invItems;
    await typeorm_1.getManager().transaction(async (trxMgr) => {
        await trxMgr.query(`
      create temp table tmp as(
        select invh.* from (
          select invh.domain_id, invh.pallet_id, max(seq) as seq from order_inventories oi
          inner join inventories inv on inv.id = oi.inventory_id
          left join inventory_histories invh on invh.domain_id = inv.domain_id and invh.pallet_id = inv.pallet_id 
          where oi.arrival_notice_id = $1 and invh.transaction_type = $2
          group by invh.domain_id, invh.pallet_id
        ) src
        inner join inventory_histories invh on invh.domain_id = src.domain_id and invh.pallet_id = src.pallet_id and invh.seq = src.seq
      )   
    `, [foundGAN.id, constants_1.TRANSACTION_TYPE.PUTAWAY]);
        invItems = await trxMgr.query(`          
      select main.product_id, main.batch_id, main.packing_type, sum(main.opening_qty) as total_qty, sum(main.opening_weight) as total_weight ,p2.name as product_name, p2.description as product_description,
      sum(case when (l2.type = $1 or l2.type = $2) then 1 else case when sec.location_id is null then 1 else 0 end end) as pallet_count,
      sum(case when l2.type = $3 then case when sec.location_id is not null then main.opening_qty else 0 end else 0 end) as mixed_count 
      from tmp main
      inner join locations l2 on l2.id::varchar = main.location_id
      inner join products p2 on p2.id::varchar = main.product_id
      left join (select location_id, count(*) as cnt from tmp group by location_id) sec on sec.location_id = main.location_id and sec.cnt > 1
      group by main.product_id, main.batch_id, main.packing_type, p2.name, p2.description
    `, [warehouse_base_1.LOCATION_TYPE.FLOOR, warehouse_base_1.LOCATION_TYPE.BUFFER, warehouse_base_1.LOCATION_TYPE.SHELF]);
        trxMgr.query(`
      drop table tmp
    `);
    });
    const data = {
        logo_url: logo,
        sign_url: signature,
        cop_url: cop,
        customer_biz: partnerBiz.name,
        customer_address: partnerBiz.address,
        company_domain: foundDomainBiz.name,
        company_phone: foundCP.phone,
        company_email: foundCP.email,
        company_brn: foundDomainBiz.description,
        company_address: foundDomainBiz.address,
        order_no: foundGRN.name,
        unload_date: datetime_util_1.DateTimeConverter.date(foundWS.endedAt),
        ref_no: ownRefNo ? `${foundGAN.name} / ${foundGAN.refNo}` : `${foundGAN.name}`,
        received_date: datetime_util_1.DateTimeConverter.date(foundWS.endedAt),
        truck_no: foundGAN.truckNo || '',
        container_no: foundGAN.containerNo || '',
        product_list: invItems.map((item, idx) => {
            return {
                list_no: idx + 1,
                product_name: `${item.product_name}(${item.product_description})`,
                product_type: item.packing_type,
                product_batch: item.batch_id,
                product_qty: item.total_qty,
                product_weight: item.total_weight,
                unit_weight: Math.round((item.total_weight / item.total_qty) * 100) / 100,
                pallet_qty: item.pallet_count,
                remark: item.pallet_count < 1
                    ? '' + (item.mixed_count ? `${item.mixed_count} ${item.packing_type}` : '')
                    : (item.pallet_count > 1 ? `${item.pallet_count} PALLETS` : `${item.pallet_count} PALLET`) +
                        (item.mixed_count ? `, ${item.mixed_count} ${item.packing_type}` : '')
            };
        })
    };
    const formData = new form_data_1.default();
    formData.append('template', template);
    formData.append('jsonString', JSON.stringify(data));
    const response = await node_fetch_1.default(REPORT_API_URL, {
        method: 'POST',
        body: formData
    });
    return await response.text();
}
exports.renderElcclGRN = renderElcclGRN;
//# sourceMappingURL=render-elccl-grn.js.map