const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const modelsNeedingTenantId = [
  'UserRoleAssignment',
  'RolePermission',
  'RefreshToken',
  'GallonStatusHistory',
  'GallonInspection',
  'GallonFillLog',
  'DeliveryProof',
  'Installment',
  'NotificationPreference'
];

for (const modelName of modelsNeedingTenantId) {
  const mapName = modelName.toLowerCase();
  const mapLine = `  @@map("${mapName}")`;
  const indexLine = `  @@index([tenant_id])`;
  
  const index = content.indexOf(mapLine);
  if (index !== -1) {
    content = content.substring(0, index) + indexLine + '\n' + content.substring(index);
    console.log(`Added @@index([tenant_id]) for ${modelName}`);
  } else {
    console.log(`WARNING: @@map line not found for ${modelName}`);
  }
}

fs.writeFileSync(schemaPath, content);
console.log('Done.');
