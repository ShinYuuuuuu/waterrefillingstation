const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
const lines = fs.readFileSync(schemaPath, 'utf8').split('\n');

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

const output = [];
let inTargetModel = false;

for (const line of lines) {
  output.push(line);
  
  // Check if entering a target model
  if (line.trim().startsWith('model ')) {
    const modelName = line.trim().split(/\s+/)[1];
    if (modelsNeedingTenantId.includes(modelName)) {
      inTargetModel = true;
    } else {
      inTargetModel = false;
    }
  }
  
  // If in target model and see id line with @default(uuid()), add tenant_id after it
  if (inTargetModel && line.includes('@id @default(uuid())')) {
    output.push('  tenant_id       String');
  }
}

// Add @@index([tenant_id]) before @@map for target models
const finalOutput = [];
for (const line of output) {
  for (const modelName of modelsNeedingTenantId) {
    const mapName = modelName.toLowerCase();
    if (line.trim() === `@@map("${mapName}")`) {
      finalOutput.push('  @@index([tenant_id])');
      break;
    }
  }
  finalOutput.push(line);
}

fs.writeFileSync(schemaPath, finalOutput.join('\n'));
console.log('tenant_id fixes applied successfully.');
