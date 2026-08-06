const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

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
  const escapedName = modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idPattern = new RegExp(`(model ${escapedName} \\{[\\s\\S]*?id\\s+String\\s+@id\\s+@default\\(uuid\\)\\(\\)[\\s\\S]*?)(\\s+[a-z_]+\\s+String)`);
  content = content.replace(idPattern, `$1  tenant_id       String\n$2`);
  
  // Add @@index([tenant_id]) before @@map
  const mapName = modelName.toLowerCase();
  const mapPattern = new RegExp(`([\\s\\S]*?model ${escapedName} \\{[\\s\\S]*?)(\\n  @@map\\(\\"${mapName}\\"\\))`);
  content = content.replace(mapPattern, `$1\n  @@index([tenant_id])$2`);
}

// Add deleted_at to models that don't have it
// Find all models and check if they have deleted_at
const modelBlocks = content.split(/(?=model \w+ \{[^}]*\n\})/gs);

for (let i = 0; i < modelBlocks.length; i++) {
  const block = modelBlocks[i];
  if (!block.includes('model ') || !block.includes('{')) continue;
  
  // Skip if already has deleted_at
  if (block.includes('deleted_at')) continue;
  
  // Find the last timestamp line (created_at, updated_at, assigned_at, changed_at, etc.)
  const timestampMatch = block.match(/(\w+_at\s+DateTime\s+@default\(now\(\)\)\s+@db\.Timestamp)/);
  if (timestampMatch) {
    const lastTimestampLine = timestampMatch[1];
    const replacement = lastTimestampLine + '\n  deleted_at          DateTime?  @db.Timestamp';
    modelBlocks[i] = block.replace(lastTimestampLine, replacement);
  }
}

content = modelBlocks.join('');

fs.writeFileSync(schemaPath, content);
console.log('Remaining fixes applied successfully.');
