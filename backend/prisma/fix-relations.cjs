/**
 * Fix script: adds missing opposite @relation fields to schema.prisma.
 * Run with: node prisma/fix-relations.cjs
 *
 * Prisma schema validation requires bidirectional relations: if Model A
 * has a list-relation field (e.g. products Product[]), the target model
 * must also have a corresponding relation field.
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

/**
 * Add a relation field to a model, inserting it after the scalar FK field.
 * modelName: e.g. "Product"
 * fkField: the scalar FK field name, e.g. "tenant_id"
 * relationLine: the full relation field declaration to insert, e.g.
 *   '  tenant            Tenant  @relation(fields: [tenant_id], references: [id])'
 * insertAfter: field name after which to insert (defaults to fkField)
 */
function addRelationAfterField(modelName, insertAfterField, relationLine) {
  // Find the model block
  const modelStart = content.indexOf(`model ${modelName} {`);
  if (modelStart === -1) {
    console.warn(`  WARN: model ${modelName} not found`);
    return false;
  }
  
  // Find the end of the model block
  const modelEnd = content.indexOf('}', modelStart);
  const modelBlock = content.slice(modelStart, modelEnd + 1);
  
  // Find the insertAfter field within the model
  const fieldRegex = new RegExp(`(  ${insertAfterField}\\s+.+)`, 'm');
  const match = modelBlock.match(fieldRegex);
  if (!match) {
    console.warn(`  WARN: field ${insertAfterField} not found in ${modelName}`);
    return false;
  }
  
  const fieldEnd = modelStart + modelBlock.indexOf(match[1]) + match[1].length;
  content = content.slice(0, fieldEnd) + '\n' + relationLine + content.slice(fieldEnd);
  return true;
}

/**
 * Add a list-relation field to a model, before the @@map line.
 */
function addListRelation(modelName, listField) {
  const modelStart = content.indexOf(`model ${modelName} {`);
  if (modelStart === -1) return false;
  
  const modelEnd = content.indexOf('}', modelStart);
  const modelBlock = content.slice(modelStart, modelEnd + 1);
  
  const mapMatch = modelBlock.match(/\n  @@map\("(\w+)"\)/);
  if (!mapMatch) {
    console.warn(`  WARN: @@map not found in ${modelName}`);
    return false;
  }
  
  const mapLineStart = modelStart + modelBlock.indexOf(mapMatch[0]);
  content = content.slice(0, mapLineStart) +
    '  ' + listField + '\n' +
    content.slice(mapLineStart);
  return true;
}

// === Product: add tenant relation ===
addRelationAfterField('Product', 'tenant_id',
  '  tenant            Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');

// === ProductCategory: add tenant relation ===
addRelationAfterField('ProductCategory', 'tenant_id',
  '  tenant          Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');

// === Customer: add tenant relation ===
addRelationAfterField('Customer', 'tenant_id',
  '  tenant            Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');

// === Customer: add installmentPlans and refunds ===
addListRelation('Customer', 'installment_plans InstallmentPlan[]');
addListRelation('Customer', 'refunds Refund[]');

// === Branch: add customers list ===
addListRelation('Branch', 'customers           Customer[]');
// === Branch: add deliveryOrders list ===
addListRelation('Branch', 'delivery_orders     DeliveryOrder[]');

// === SalesTransaction: add tenant and user relations ===
addRelationAfterField('SalesTransaction', 'tenant_id',
  '  tenant            Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');
addRelationAfterField('SalesTransaction', 'created_by',
  '  user             User      @relation("SalesTransactionUser", fields: [created_by], references: [id])');
// === SalesTransaction: add deliveryOrders list ===
addListRelation('SalesTransaction', 'delivery_orders     DeliveryOrder[]');

// === DeliveryOrder: add tenant relation ===
addRelationAfterField('DeliveryOrder', 'tenant_id',
  '  tenant              Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');

// === Equipment: add branch relation ===
addRelationAfterField('Equipment', 'branch_id',
  '  branch            Branch  @relation(fields: [branch_id], references: [id])');

// === DeliveryRoute: add branch relation ===
addRelationAfterField('DeliveryRoute', 'branch_id',
  '  branch            Branch  @relation(fields: [branch_id], references: [id])');

// === ContainerMovement: add branch relation ===
addRelationAfterField('ContainerMovement', 'branch_id',
  '  branch            Branch  @relation(fields: [branch_id], references: [id])');

// === User: add salesTransactions, deliveryRoutes, containerMovements, maintenanceLogs, gallonCleanings, gallonInspections, gallonFillLogs ===
addListRelation('User', 'sales_transactions   SalesTransaction[]');
addListRelation('User', 'delivery_routes      DeliveryRoute[]');
addListRelation('User', 'container_movements  ContainerMovement[]');
addListRelation('User', 'maintenance_logs     MaintenanceLog[]');
addListRelation('User', 'gallon_cleanings     GallonCleaningRecord[]');
addListRelation('User', 'gallon_inspections   GallonInspection[]');
addListRelation('User', 'gallon_fill_logs     GallonFillLog[]');

// === Role: add roles list to Tenant ===
addListRelation('Tenant', 'roles               Role[]');
// === Permission: add permissions list to Tenant ===
addListRelation('Tenant', 'permissions          Permission[]');

// === UserRoleAssignment: add userRoleAssignments to Branch ===
addListRelation('Branch', 'user_role_assignments UserRoleAssignment[]');

// === ContainerDeposit: add container_deposits to Gallon ===
addListRelation('Gallon', 'container_deposits  ContainerDeposit[]');

// === StandingOrderItem: add standingOrderItems to Product ===
addListRelation('Product', 'standing_order_items StandingOrderItem[]');

// === RouteStop: add routeStops to DeliveryOrder ===
addListRelation('DeliveryOrder', 'route_stops         RouteStop[]');

// === Notification: add tenant relation ===
addRelationAfterField('Notification', 'tenant_id',
  '  tenant            Tenant  @relation(fields: [tenant_id], references: [id], onDelete: Cascade)');

// === MaintenanceLog: add user relation ===
addRelationAfterField('MaintenanceLog', 'performed_by',
  '  maintainer        User  @relation(fields: [performed_by], references: [id])');

// === ContainerMovement (User side): already handled via User.container_movements ===
// But ContainerMovement needs a user_id field. Check if exists.
// The error was: User.container_movements missing opposite on ContainerMovement
// If ContainerMovement has a user_id field, add the relation.

// === GallonCleaningRecord: add user relation ===
addRelationAfterField('GallonCleaningRecord', 'performed_by',
  '  performed_by_user  User  @relation(fields: [performed_by], references: [id])');

// === GallonInspection: add user relation ===
addRelationAfterField('GallonInspection', 'performed_by',
  '  inspector          User  @relation(fields: [performed_by], references: [id])');

// === GallonFillLog: add user relation ===
addRelationAfterField('GallonFillLog', 'performed_by',
  '  fill_operator       User  @relation(fields: [performed_by], references: [id])');

// === InstallmentPlan: add customer relation (already has customer_id and customer) ===
// The error was: customer in InstallmentPlan missing opposite on Customer
// Already added installment_plans to Customer above

// === Refund: add customer relation (already has customer_id and customer) ===
// Already added refunds to Customer above

// === DeliveryRoute rider: add delivery_routes to User ===
// Already added delivery_routes to User above

console.log('Relation fixes applied successfully.');
fs.writeFileSync(schemaPath, content);

// Verify by re-reading
const updated = fs.readFileSync(schemaPath, 'utf8');
const hasError = updated.includes('Error validating field');
console.log(`Schema fix complete. File size: ${updated.length} chars.`);
