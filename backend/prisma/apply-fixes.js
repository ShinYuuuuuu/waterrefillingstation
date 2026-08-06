const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'backend', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// FIX-01: Add deleted_at after updated_at in all models
// Match: updated_at<spaces>DateTime<spaces>@default(now()) @db.Timestamp
content = content.replace(/(updated_at\s+DateTime\s+@default\(now\(\)\)\s+@db\.Timestamp)/g, 
  '$1\n  deleted_at          DateTime?  @db.Timestamp');

// FIX-03: Change ContainerMovement.movement_type from String to MovementType
content = content.replace(/movement_type\s+String/, 'movement_type          MovementType');

// FIX-02: Add tenant_id to 9 missing models
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
  // Add tenant_id after id line
  const idPattern = new RegExp(`(model ${modelName} \\{[\\s\\S]*?id\\s+String\\s+@id\\s+@default\\(uuid\\)\\(\\)[\\s\\S]*?)(\\s+[a-z_]+\\s+String)`);
  content = content.replace(idPattern, `$1  tenant_id       String\n$2`);
  
  // Add @@index([tenant_id]) before @@map
  const mapName = modelName.toLowerCase();
  const mapPattern = new RegExp(`([\\s\\S]*?model ${modelName} \\{[\\s\\S]*?)(\\n  @@map\\(\\"${mapName}\\"\\))`);
  content = content.replace(mapPattern, `$1\n  @@index([tenant_id])$2`);
}

fs.writeFileSync(schemaPath, content);
console.log('Schema fixes applied successfully.');
