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
  const escapedName = modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mapName = modelName.toLowerCase();
  // Use \r?\n to match both Windows and Unix line endings
  const mapPattern = new RegExp(`([\\s\\S]*?model ${escapedName} \\{[\\s\\S]*?)(\\r?\\n  @@map\\(\\"${mapName}\\"\\))`);
  content = content.replace(mapPattern, `$1\n  @@index([tenant_id])$2`);
}

fs.writeFileSync(schemaPath, content);
console.log('@@index([tenant_id]) fixes applied successfully.');
