'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function oaBru({
  name,
  funcId,
  externalIdVar,
  reasonCode,
  reasonText,
  serviceAccVar,
  providerStatus = 'Failure',
  providerMilestone = 'Failure',
}) {
  const acc = serviceAccVar || externalIdVar;
  const reasonCodeJson = reasonCode == null ? 'null' : JSON.stringify(reasonCode);
  return `meta {
  name: ${name}
  type: http
  seq: 1
}

post {
  url: {{demo-mob-dev}}/serviceInstallationManagement/v1/notification/
  body: json
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  {
    "eventId": "Event-{{orderId}}",
    "eventTime": "{{eventDate}}",
    "eventType": "serviceOrderStateChangeNotification",
    "event": {
      "serviceOrder": {
        "funcId": "${funcId}",
        "externalId": "{{${externalIdVar}}}",
        "lineItemIdentifier": "",
        "lineItemStatus": "",
        "description": "",
        "orderStatus": "",
        "comments": "",
        "providerStatus": "${providerStatus}",
        "providerMilestone": "${providerMilestone}",
        "providerComments": ${JSON.stringify(reasonText)},
        "orderTransactionNo": "",
        "serviceAccNum": "{{${acc}}}",
        "reasonCode": ${reasonCodeJson},
        "reasonText": ${JSON.stringify(reasonText)}
      }
    }
  }
}

script:pre-request {
  bru.setVar('eventTime', new Date().toISOString());
  bru.setVar('eventDate', new Date().toISOString());
}

settings {
  encodeUrl: true
  timeout: 0
}
`;
}

function mobBru({ name, reasonCode, reasonText }) {
  return `meta {
  name: ${name}
  type: http
  seq: 1
}

post {
  url: {{demo-mob-dev}}/workForceManagement/v1/notification/
  body: json
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  {
    "eventId": "Event-{{orderId}}",
    "eventTime": "{{eventDate}}",
    "eventType": "workOrderStateChangeNotification",
    "event": {
      "workOrder": {
        "id": "{{workOrderIdCpe}}",
        "externalId": "{{orderId}}",
        "state": "COMPLETED",
        "partition": "VIRTUALVENDOR_Failure",
        "region": "VIC_Failure",
        "vendorName": "ventorMob_Failure",
        "engineerId": "mob-engg-1_Failure",
        "engineerName": "enggAndy_Failure",
        "engineerPhone": "+100-56-0019910",
        "odbPort": "343",
        "reasonCode": "${reasonCode}",
        "reasonText": ${JSON.stringify(reasonText)},
        "comments": ${JSON.stringify(reasonText)},
        "timestamp": "{{eventDate}}"
      }
    }
  }
}

script:pre-request {
  bru.setVar('eventTime', new Date().toISOString());
  bru.setVar('eventDate', new Date().toISOString());
}

settings {
  encodeUrl: true
  timeout: 0
}
`;
}

function writeAll(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    const abs = path.join(dir, f);
    if (f === 'folder.bru') continue;
    if (f.endsWith('.bru')) fs.unlinkSync(abs);
    else if (fs.statSync(abs).isDirectory()) fs.rmSync(abs, { recursive: true, force: true });
  }
  for (const [file, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, file), body, 'utf8');
    console.log('WRITE', path.relative(root, path.join(dir, file)));
  }
}

const itc = {
  'ITC-IF-T1-V1-Fiber-Cut.bru': oaBru({
    name: 'ITC-IF-T1-V1-Fiber-Cut',
    funcId: 'ITC_ORDER_UPDATE',
    externalIdVar: 'itcInstallationId',
    reasonCode: null,
    reasonText: 'FIBER CUT',
  }),
  'ITC-IF-T1-V2-Wrong-ODB.bru': oaBru({
    name: 'ITC-IF-T1-V2-Wrong-ODB',
    funcId: 'ITC_ORDER_UPDATE',
    externalIdVar: 'itcInstallationId',
    reasonCode: null,
    reasonText: 'WRONG ODB',
  }),
  'ITC-IF-T2-Internal-Wiring.bru': oaBru({
    name: 'ITC-IF-T2-Internal-Wiring',
    funcId: 'ITC_ORDER_UPDATE',
    externalIdVar: 'itcInstallationId',
    reasonCode: null,
    reasonText: 'INTERNAL WIRING',
  }),
  'ITC-IF-T3-Wrong-Customer-Contact.bru': oaBru({
    name: 'ITC-IF-T3-Wrong-Customer-Contact',
    funcId: 'ITC_ORDER_UPDATE',
    externalIdVar: 'itcInstallationId',
    reasonCode: null,
    reasonText: 'WRONG CUSTOMER CONTACT',
  }),
  'ITC-IF-T4-No-HAG-Available.bru': oaBru({
    name: 'ITC-IF-T4-No-HAG-Available',
    funcId: 'ITC_ORDER_UPDATE',
    externalIdVar: 'itcInstallationId',
    reasonCode: null,
    reasonText: 'NO HAG AVAILABLE',
  }),
};

const stc = {
  'STC-IF-T1-V1-B11-OLO-Fiber-Cut.bru': oaBru({
    name: 'STC-IF-T1-V1-B11-OLO-Fiber-Cut',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'B11-OLO',
    reasonText: 'B11-OLO - FIBER CUT B/W TB & FDT',
  }),
  'STC-IF-T1-V2-B15-OLO-Wrong-Plate-ID.bru': oaBru({
    name: 'STC-IF-T1-V2-B15-OLO-Wrong-Plate-ID',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'B15-OLO',
    reasonText: 'WRONG PLATE ID',
  }),
  'STC-IF-T2-B24-OLO-Internal-Wiring.bru': oaBru({
    name: 'STC-IF-T2-B24-OLO-Internal-Wiring',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'B24-OLO',
    reasonText: 'INTERNAL WIRING',
  }),
  'STC-IF-T3-B23-OLO-Wrong-Contact-Number.bru': oaBru({
    name: 'STC-IF-T3-B23-OLO-Wrong-Contact-Number',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'B23-OLO',
    reasonText: 'B23-OLO - WRONG CONTACT NUMBER',
  }),
  'STC-IF-T4-B167-OLO-No-HAG-Available.bru': oaBru({
    name: 'STC-IF-T4-B167-OLO-No-HAG-Available',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'B167-OLO',
    reasonText: 'B167-OLO - NO HAG AVAILABLE',
  }),
  'STC-IF-T5-No-Details.bru': oaBru({
    name: 'STC-IF-T5-No-Details',
    funcId: 'STC_ORDER_UPDATE',
    externalIdVar: 'stcInstallationId',
    reasonCode: 'NO DETAILS',
    reasonText: 'NO DETAILS',
  }),
};

const dowiyat = {
  'DOWIYAT-IF-T1-V1-Fiber-Cut.bru': oaBru({
    name: 'DOWIYAT-IF-T1-V1-Fiber-Cut',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'FIBER CUT',
  }),
  'DOWIYAT-IF-T1-V2-Commercial-Area.bru': oaBru({
    name: 'DOWIYAT-IF-T1-V2-Commercial-Area',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'COMMERCIAL AREA',
  }),
  'DOWIYAT-IF-T1-V3-Duplicate-Order.bru': oaBru({
    name: 'DOWIYAT-IF-T1-V3-Duplicate-Order',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'DUPLICATE ORDER',
  }),
  'DOWIYAT-IF-T2-Internal-Wiring.bru': oaBru({
    name: 'DOWIYAT-IF-T2-Internal-Wiring',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'INTERNAL WIRING',
  }),
  'DOWIYAT-IF-T3-Wrong-Customer-Contact.bru': oaBru({
    name: 'DOWIYAT-IF-T3-Wrong-Customer-Contact',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'WRONG CUSTOMER CONTACT',
  }),
  'DOWIYAT-IF-T4-No-HAG-Available.bru': oaBru({
    name: 'DOWIYAT-IF-T4-No-HAG-Available',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'NO HAG AVAILABLE',
  }),
  'DOWIYAT-IF-T5-Others.bru': oaBru({
    name: 'DOWIYAT-IF-T5-Others',
    funcId: 'DOWIYAT_ORDER_UPDATE',
    externalIdVar: 'dawiyatInstallationId',
    reasonCode: null,
    reasonText: 'OTHERS',
  }),
};

const acesPending = { providerStatus: 'Pending', providerMilestone: 'Pending' };
const aces = {
  'ACES-IF-T1-V1-CST005-Fiber-Cut.bru': oaBru({
    name: 'ACES-IF-T1-V1-CST005-Fiber-Cut',
    funcId: 'ACES_ORDER_UPDATE',
    externalIdVar: 'acesInstallationId',
    reasonCode: 'CST005',
    reasonText: 'FIBER CUT',
    serviceAccVar: 'acesServiceAccNum',
    ...acesPending,
  }),
  'ACES-IF-T1-V2-CST001-Commercial-Area.bru': oaBru({
    name: 'ACES-IF-T1-V2-CST001-Commercial-Area',
    funcId: 'ACES_ORDER_UPDATE',
    externalIdVar: 'acesInstallationId',
    reasonCode: 'CST001',
    reasonText: 'COMMERCIAL AREA',
    serviceAccVar: 'acesServiceAccNum',
    ...acesPending,
  }),
  'ACES-IF-T2-CST002-Customer-Cancelation.bru': oaBru({
    name: 'ACES-IF-T2-CST002-Customer-Cancelation',
    funcId: 'ACES_ORDER_UPDATE',
    externalIdVar: 'acesInstallationId',
    reasonCode: 'CST002',
    reasonText: 'CUSTOMER CANCELATION',
    serviceAccVar: 'acesServiceAccNum',
    ...acesPending,
  }),
  'ACES-IF-T4-CST007-No-HAG-Available.bru': oaBru({
    name: 'ACES-IF-T4-CST007-No-HAG-Available',
    funcId: 'ACES_ORDER_UPDATE',
    externalIdVar: 'acesInstallationId',
    reasonCode: 'CST007',
    reasonText: 'NO HAG AVAILABLE',
    serviceAccVar: 'acesServiceAccNum',
    ...acesPending,
  }),
};

const mob = {
  'MOB-IF-T1-2010-NS-No-Signal.bru': mobBru({
    name: 'MOB-IF-T1-2010-NS-No-Signal',
    reasonCode: '2010',
    reasonText: 'NS-NO SIGNAL',
  }),
  'MOB-IF-T2-2020-CPE-STB-Swap-Failure.bru': mobBru({
    name: 'MOB-IF-T2-2020-CPE-STB-Swap-Failure',
    reasonCode: '2020',
    reasonText: 'SYS - CPE/STB SWAP FAILURE',
  }),
  'MOB-IF-T3-2060-Wrong-Contact-No.bru': mobBru({
    name: 'MOB-IF-T3-2060-Wrong-Contact-No',
    reasonCode: '2060',
    reasonText: 'WRONG INFO - WRONG CONTACT NO.',
  }),
  'MOB-IF-T4-2040-Customer-Not-Reachable.bru': mobBru({
    name: 'MOB-IF-T4-2040-Customer-Not-Reachable',
    reasonCode: '2040',
    reasonText: 'CUSTOMER NOT REACHABLE',
  }),
};

writeAll(path.join(root, 'OpenAccess/ITC/Installation-Failure'), itc);
writeAll(path.join(root, 'OpenAccess/STC/Installation-Failure'), stc);
writeAll(path.join(root, 'OpenAccess/DOWIYAT/Installation-Failure'), dowiyat);
writeAll(path.join(root, 'OpenAccess/ACES/Installation-Failure'), aces);
writeAll(path.join(root, 'Mobily/Installation-Failure'), mob);
console.log('IF canonical set written');
