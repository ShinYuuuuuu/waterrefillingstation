import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const customerPasswordHash = await bcrypt.hash('customer123', 10)

  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Z's Purified Drinking Water",
      subscription_plan: 'enterprise',
      subscription_status: 'active',
      is_active: true,
      created_by: 'system',
    },
  })
  console.log('Created tenant:', tenant.name)

  // Create Branch (HQ)
  const branch = await prisma.branch.create({
    data: {
      tenant_id: tenant.id,
      name: 'Main Station',
      address: '123 Rizal Street, Brgy. Poblacion, Makati City',
      contact_number: '+639171234567',
      email: 'main@aquapure.com',
      tin: '123-456-789-000',
      is_hq: true,
      is_active: true,
      business_hours: {
        monday: { open: '06:00', close: '21:00' },
        tuesday: { open: '06:00', close: '21:00' },
        wednesday: { open: '06:00', close: '21:00' },
        thursday: { open: '06:00', close: '21:00' },
        friday: { open: '06:00', close: '21:00' },
        saturday: { open: '06:00', close: '20:00' },
        sunday: { open: '07:00', close: '18:00' },
      },
      created_by: 'system',
    },
  })
  console.log('Created branch:', branch.name)

  // Create Roles
  const roles = await prisma.$transaction([
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'owner',
        name: 'Owner / Business Admin',
        description: 'Owns one or more station branches; full access to all branches, financials, settings.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'branch_manager',
        name: 'Branch Manager',
        description: 'Manages a single branch: staff, inventory, pricing (within limits), approvals.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'cashier',
        name: 'Cashier / Counter Staff',
        description: 'Operates POS, processes walk-in sales, handles cash drawer/shift.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'inventory_staff',
        name: 'Inventory Staff',
        description: 'Manages stock in/out, production logging, stock transfers, stock counts.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'rider',
        name: 'Rider / Delivery Personnel',
        description: 'Uses mobile app to view assigned deliveries, update status, collect payment.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'dispatcher',
        name: 'Dispatcher',
        description: 'Assigns orders to riders, manages routes and schedules.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'accountant',
        name: 'Accountant / Bookkeeper',
        description: 'Views financial reports, manages billing/collections, reconciles payments, generates tax reports.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'technician',
        name: 'Technician',
        description: 'Logs equipment maintenance, filter changes, machine downtime.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'customer',
        name: 'Customer',
        description: 'Places orders, views order history, account/loyalty balance.',
        is_system: true,
        is_active: true,
      },
    }),
    prisma.role.create({
      data: {
        tenant_id: tenant.id,
        code: 'reseller',
        name: 'Reseller / Dealer',
        description: 'Places bulk orders, views own account balance and order history.',
        is_system: true,
        is_active: true,
      },
    }),
  ])
  console.log('Created roles:', roles.length)

  // Get role codes for assignment
  const roleMap = new Map(roles.map((r) => [r.code, r.id]))

  // Create Permissions
  const permissions = await prisma.permission.createMany({
    data: [
      { tenant_id: tenant.id, module: 'customer', action: 'read', code: 'customers.read', description: 'View customer list and details' },
      { tenant_id: tenant.id, module: 'customer', action: 'create', code: 'customers.create', description: 'Create new customers' },
      { tenant_id: tenant.id, module: 'customer', action: 'update', code: 'customers.update', description: 'Update customer details' },
      { tenant_id: tenant.id, module: 'customer', action: 'delete', code: 'customers.delete', description: 'Delete/deactivate customers' },
      { tenant_id: tenant.id, module: 'product', action: 'read', code: 'products.read', description: 'View product list and details' },
      { tenant_id: tenant.id, module: 'product', action: 'create', code: 'products.create', description: 'Create new products' },
      { tenant_id: tenant.id, module: 'product', action: 'update', code: 'products.update', description: 'Update product details' },
      { tenant_id: tenant.id, module: 'product', action: 'delete', code: 'products.delete', description: 'Delete/deactivate products' },
      { tenant_id: tenant.id, module: 'product', action: 'archive', code: 'products.archive', description: 'Archive products' },
      { tenant_id: tenant.id, module: 'product', action: 'reactivate', code: 'products.reactivate', description: 'Reactivate archived products' },
      { tenant_id: tenant.id, module: 'inventory', action: 'read', code: 'inventory.read', description: 'View inventory levels' },
      { tenant_id: tenant.id, module: 'inventory', action: 'create', code: 'inventory.create', description: 'Create inventory records' },
      { tenant_id: tenant.id, module: 'inventory', action: 'update', code: 'inventory.update', description: 'Update inventory records' },
      { tenant_id: tenant.id, module: 'inventory', action: 'delete', code: 'inventory.delete', description: 'Delete inventory records' },
      { tenant_id: tenant.id, module: 'inventory', action: 'production_create', code: 'inventory.production.create', description: 'Create production batches' },
      { tenant_id: tenant.id, module: 'inventory', action: 'production_read', code: 'inventory.production.read', description: 'View production batches' },
      { tenant_id: tenant.id, module: 'inventory', action: 'production_update', code: 'inventory.production.update', description: 'Update production batches' },
      { tenant_id: tenant.id, module: 'inventory', action: 'transfer_create', code: 'inventory.transfer.create', description: 'Create stock transfers' },
      { tenant_id: tenant.id, module: 'inventory', action: 'transfer_approve', code: 'inventory.transfer.approve', description: 'Approve stock transfers' },
      { tenant_id: tenant.id, module: 'inventory', action: 'transfer_receive', code: 'inventory.transfer.receive', description: 'Receive stock transfers' },
      { tenant_id: tenant.id, module: 'inventory', action: 'stock_count_start', code: 'inventory.stock_count.start', description: 'Start stock counts' },
      { tenant_id: tenant.id, module: 'inventory', action: 'stock_count_approve', code: 'inventory.stock_count.approve', description: 'Approve stock counts' },
      { tenant_id: tenant.id, module: 'inventory', action: 'adjust', code: 'inventory.adjust', description: 'Adjust inventory' },
      { tenant_id: tenant.id, module: 'inventory', action: 'ledger_read', code: 'inventory.ledger.read', description: 'View inventory ledger' },
      { tenant_id: tenant.id, module: 'inventory', action: 'alerts_read', code: 'inventory.alerts.read', description: 'View inventory alerts' },
      { tenant_id: tenant.id, module: 'inventory', action: 'update_request_create', code: 'inventory.update_request.create', description: 'Submit inventory count and low-stock requests' },
      { tenant_id: tenant.id, module: 'inventory', action: 'update_request_read', code: 'inventory.update_request.read', description: 'View inventory update requests' },
      { tenant_id: tenant.id, module: 'inventory', action: 'update_request_approve', code: 'inventory.update_request.approve', description: 'Approve or reject inventory update requests' },
      { tenant_id: tenant.id, module: 'sales', action: 'read', code: 'sales.read', description: 'View sales transactions' },
      { tenant_id: tenant.id, module: 'sales', action: 'create', code: 'sales.create', description: 'Create sales transactions' },
      { tenant_id: tenant.id, module: 'sales', action: 'update', code: 'sales.update', description: 'Update sales transactions' },
      { tenant_id: tenant.id, module: 'sales', action: 'delete', code: 'sales.delete', description: 'Delete sales transactions' },
      { tenant_id: tenant.id, module: 'sales', action: 'void', code: 'sales.void', description: 'Void sales transactions' },
      { tenant_id: tenant.id, module: 'sales', action: 'payment', code: 'sales.payment', description: 'Record payments' },
      { tenant_id: tenant.id, module: 'gallons', action: 'read', code: 'gallons.read', description: 'View gallon assets' },
      { tenant_id: tenant.id, module: 'gallons', action: 'create', code: 'gallons.create', description: 'Create gallon records' },
      { tenant_id: tenant.id, module: 'gallons', action: 'update', code: 'gallons.update', description: 'Update gallon records' },
      { tenant_id: tenant.id, module: 'gallons', action: 'delete', code: 'gallons.delete', description: 'Delete gallon records' },
      { tenant_id: tenant.id, module: 'delivery', action: 'read', code: 'delivery.read', description: 'View delivery orders' },
      { tenant_id: tenant.id, module: 'delivery', action: 'create', code: 'delivery.create', description: 'Create delivery orders' },
      { tenant_id: tenant.id, module: 'delivery', action: 'update', code: 'delivery.update', description: 'Update delivery orders' },
      { tenant_id: tenant.id, module: 'delivery', action: 'delete', code: 'delivery.delete', description: 'Delete delivery orders' },
      { tenant_id: tenant.id, module: 'delivery', action: 'assign', code: 'delivery.assign', description: 'Assign riders to delivery orders' },
      { tenant_id: tenant.id, module: 'delivery', action: 'status', code: 'delivery.status', description: 'Update delivery order status' },
    ],
    skipDuplicates: true,
  })
  console.log('Created permissions:', permissions.count)

  const permissionMap = new Map((await prisma.permission.findMany({ where: { tenant_id: tenant.id } })).map((p) => [p.code, p.id]))

  // Helper to assign permissions to a role
  async function assignPermissions(roleCode: string, permissionCodes: string[]) {
    const roleId = roleMap.get(roleCode)
    if (!roleId) return
    const rolePermissions = permissionCodes.map((code) => ({
      tenant_id: tenant.id,
      role_id: roleId,
      permission_id: permissionMap.get(code)!,
    })).filter((rp) => rp.permission_id)
    if (rolePermissions.length > 0) {
      await prisma.rolePermission.createMany({ data: rolePermissions, skipDuplicates: true })
    }
  }

  // Owner gets all permissions
  await assignPermissions('owner', Array.from(permissionMap.keys()))

  // Cashier permissions
  await assignPermissions('cashier', [
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'products.read',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.alerts.read',
    'inventory.update_request.create',
    'sales.read', 'sales.create', 'sales.update', 'sales.payment',
    'gallons.read',
    'delivery.read', 'delivery.create', 'delivery.update', 'delivery.assign',
  ])

  // Rider permissions
  await assignPermissions('rider', [
    'sales.read', 'sales.create', 'sales.update', 'sales.payment',
    'gallons.read',
    'delivery.read', 'delivery.status',
  ])

  // Branch manager permissions
  await assignPermissions('branch_manager', [
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'inventory.read', 'inventory.create', 'inventory.update',
    'sales.read', 'sales.create', 'sales.update',
    'gallons.read', 'gallons.create', 'gallons.update', 'gallons.delete',
  ])

  // Dispatcher permissions
  await assignPermissions('dispatcher', [
    'sales.read', 'sales.create', 'sales.update', 'sales.payment',
  ])

  // Accountant permissions
  await assignPermissions('accountant', [
    'sales.read', 'sales.payment',
  ])

  // Inventory staff permissions
  await assignPermissions('inventory_staff', [
    'inventory.read', 'inventory.create', 'inventory.update',
    'inventory.production.create', 'inventory.production.read', 'inventory.production.update',
    'inventory.transfer.create', 'inventory.transfer.receive',
    'inventory.stock_count.start', 'inventory.adjust',
    'inventory.ledger.read', 'inventory.alerts.read',
    'inventory.update_request.create', 'inventory.update_request.read',
  ])

  // Technician permissions
  await assignPermissions('technician', [
    'gallons.read', 'gallons.update',
  ])

  // Create Admin User (Owner)
  const adminUser = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      full_name: 'Juan Dela Cruz',
      email: 'owner@aquapure.com',
      phone: '+639171234567',
      password_hash: adminPasswordHash,
      status: 'active',
      last_login_at: new Date(),
      created_by: 'system',
    },
  })
  console.log('Created admin user:', adminUser.email)

  // Assign Owner role to admin
  await prisma.userRoleAssignment.create({
    data: {
      tenant_id: tenant.id,
      user_id: adminUser.id,
      role_id: roleMap.get('owner')!,
      branch_id: branch.id,
      is_active: true,
      assigned_by: 'system',
    },
  })

  // Create sample Cashier
  const cashier = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      full_name: 'Maria Santos',
      email: 'cashier@aquapure.com',
      phone: '+639189876543',
      password_hash: await bcrypt.hash('cashier123', 10),
      status: 'active',
      created_by: adminUser.id,
    },
  })
  console.log('Created cashier:', cashier.email)

  await prisma.userRoleAssignment.create({
    data: {
      tenant_id: tenant.id,
      user_id: cashier.id,
      role_id: roleMap.get('cashier')!,
      branch_id: branch.id,
      is_active: true,
      assigned_by: adminUser.id,
    },
  })

  // Create sample Rider
  const rider = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      full_name: 'Pedro Reyes',
      email: 'rider@aquapure.com',
      phone: '+639165432198',
      password_hash: await bcrypt.hash('rider123', 10),
      status: 'active',
      created_by: adminUser.id,
    },
  })
  console.log('Created rider:', rider.email)

  await prisma.userRoleAssignment.create({
    data: {
      tenant_id: tenant.id,
      user_id: rider.id,
      role_id: roleMap.get('rider')!,
      branch_id: branch.id,
      is_active: true,
      assigned_by: adminUser.id,
    },
  })

  // Create Product Categories
  const categoryWater = await prisma.productCategory.create({
    data: {
      tenant_id: tenant.id,
      name: 'Water Products',
      description: 'Purified and mineral water products',
      is_active: true,
    },
  })

  const categoryContainers = await prisma.productCategory.create({
    data: {
      tenant_id: tenant.id,
      name: 'Containers',
      description: 'Reusable water containers/gallons',
      parent_id: categoryWater.id,
      is_active: true,
    },
  })

  const categoryAccessories = await prisma.productCategory.create({
    data: {
      tenant_id: tenant.id,
      name: 'Accessories',
      description: 'Dispensers, faucets, and related accessories',
      is_active: true,
    },
  })

  const categoryRawMaterials = await prisma.productCategory.create({
    data: {
      tenant_id: tenant.id,
      name: 'Raw Materials',
      description: 'Filters, caps, seals, labels',
      is_active: true,
    },
  })

  console.log('Created product categories:', 4)

  // Create Products
  const products = await prisma.$transaction([
    // Container Types
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryContainers.id,
        sku: 'CONT-5G-RND',
        name: '5-Gallon Round Bottle',
        type: 'CONTAINER',
        unit_of_measure: 'gallon',
        base_price: 50,
        cost_price: 120,
        is_container: true,
        deposit_amount: 50,
        reorder_level: 100,
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryContainers.id,
        sku: 'CONT-5G-SLIM',
        name: '5-Gallon Slim Bottle',
        type: 'CONTAINER',
        unit_of_measure: 'gallon',
        base_price: 50,
        cost_price: 130,
        is_container: true,
        deposit_amount: 50,
        reorder_level: 80,
        is_active: true,
      },
    }),
    // Water Products
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryWater.id,
        sku: 'WATER-5G-REFILL',
        name: '5-Gallon Refill (Purified)',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'gallon',
        base_price: 20,
        cost_price: 8,
        is_container: false,
        deposit_amount: null,
        reorder_level: 200,
        is_active: true,
        is_stock_tracked: false,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryWater.id,
        sku: 'SERVICE-DELIVERY',
        name: 'Delivery Fee',
        description: 'Delivery surcharge charged per gallon of water',
        type: 'SERVICE',
        unit_of_measure: 'service',
        base_price: 5,
        cost_price: 0,
        is_container: false,
        deposit_amount: null,
        reorder_level: 0,
        is_active: true,
        is_stock_tracked: false,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryWater.id,
        sku: 'WATER-5G-NEW',
        name: '5-Gallon New Bottle',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'gallon',
        base_price: 150,
        cost_price: 120,
        is_container: true,
        deposit_amount: 50,
        reorder_level: 20,
        is_active: true,
        is_stock_tracked: true,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryWater.id,
        sku: 'WATER-1G-REFILL',
        name: '1-Gallon Refill',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'gallon',
        base_price: 20,
        cost_price: 3,
        is_container: false,
        deposit_amount: null,
        reorder_level: 100,
        is_active: true,
        is_stock_tracked: false,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryWater.id,
        sku: 'WATER-1G-NEW',
        name: 'A Gallon of Water',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'gallon',
        base_price: 35,
        cost_price: 10,
        is_container: false,
        deposit_amount: null,
        reorder_level: 100,
        is_active: true,
        is_stock_tracked: false,
      },
    }),
    // Accessories
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryAccessories.id,
        sku: 'ACC-DISP-MINI',
        name: 'Mini Water Dispenser',
        type: 'ACCESSORY',
        unit_of_measure: 'piece',
        base_price: 500,
        cost_price: 350,
        is_container: false,
        deposit_amount: null,
        reorder_level: 10,
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryAccessories.id,
        sku: 'ACC-DISP-REG',
        name: 'Regular Water Dispenser',
        type: 'ACCESSORY',
        unit_of_measure: 'piece',
        base_price: 1200,
        cost_price: 800,
        is_container: false,
        deposit_amount: null,
        reorder_level: 5,
        is_active: true,
      },
    }),
    // Raw Materials
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryRawMaterials.id,
        sku: 'RAW-FILT-SED',
        name: 'Sediment Filter',
        type: 'RAW_MATERIAL',
        unit_of_measure: 'piece',
        base_price: 200,
        cost_price: 100,
        is_container: false,
        deposit_amount: null,
        reorder_level: 20,
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryRawMaterials.id,
        sku: 'RAW-FILT-CAR',
        name: 'Carbon Filter',
        type: 'RAW_MATERIAL',
        unit_of_measure: 'piece',
        base_price: 300,
        cost_price: 150,
        is_container: false,
        deposit_amount: null,
        reorder_level: 15,
        is_active: true,
      },
    }),
    prisma.product.create({
      data: {
        tenant_id: tenant.id,
        category_id: categoryRawMaterials.id,
        sku: 'RAW-MEM-RO',
        name: 'RO Membrane',
        type: 'RAW_MATERIAL',
        unit_of_measure: 'piece',
        base_price: 800,
        cost_price: 400,
        is_container: false,
        deposit_amount: null,
        reorder_level: 5,
        is_active: true,
      },
    }),
  ])
  await prisma.product.updateMany({
    where: {
      tenant_id: tenant.id,
      sku: { notIn: ['WATER-5G-REFILL', 'SERVICE-DELIVERY'] },
    },
    data: { is_active: false },
  })
  await prisma.product.update({
    where: { id: products.find((product) => product.sku === 'WATER-5G-REFILL')!.id },
    data: { name: 'Purified Water Refill', base_price: 20 },
  })
  console.log('Created products:', products.length)

  // Get product SKUs for gallon types
  const cont5gRound = products.find((p) => p.sku === 'CONT-5G-RND')!
  const cont5gSlim = products.find((p) => p.sku === 'CONT-5G-SLIM')!
  const water5gRefill = products.find((p) => p.sku === 'WATER-5G-REFILL')!

  // Create Gallon Types
  const gallonTypes = await prisma.$transaction([
    prisma.gallonType.create({
      data: {
        tenant_id: tenant.id,
        product_id: cont5gRound.id,
        name: '5-Gallon Round',
        description: 'Standard round 5-gallon water bottle',
        capacity_liters: 19,
        material: 'PET Plastic',
        color: 'Blue',
        is_active: true,
      },
    }),
    prisma.gallonType.create({
      data: {
        tenant_id: tenant.id,
        product_id: cont5gSlim.id,
        name: '5-Gallon Slim',
        description: 'Slim-profile 5-gallon water bottle',
        capacity_liters: 19,
        material: 'PET Plastic',
        color: 'Blue',
        is_active: true,
      },
    }),
  ])
  console.log('Created gallon types:', gallonTypes.length)

  // Create Branch Inventory
  const branchInventories = await prisma.$transaction([
    prisma.branchInventory.create({
      data: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        product_id: cont5gRound.id,
        quantity_on_hand: 150,
        reserved_quantity: 20,
      },
    }),
    prisma.branchInventory.create({
      data: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        product_id: cont5gSlim.id,
        quantity_on_hand: 100,
        reserved_quantity: 10,
      },
    }),
    prisma.branchInventory.create({
      data: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        product_id: water5gRefill.id,
        quantity_on_hand: 300,
        reserved_quantity: 50,
      },
    }),
  ])
  console.log('Created branch inventory records:', branchInventories.length)

  // Create Sample Gallons (individual container tracking)
  const sampleGallons = []
  for (let i = 1; i <= 20; i++) {
    const gallon = await prisma.gallon.create({
      data: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        gallon_type_id: gallonTypes[0].id,
        tag_code: `AQUA-RND-${String(i).padStart(4, '0')}`,
        serial_number: `SN-RND-2024-${String(i).padStart(4, '0')}`,
        status: 'IN_STOCK',
        current_holder_type: 'branch',
        current_holder_id: branch.id,
        current_condition: 'good',
        purchase_date: new Date('2024-01-15'),
        purchase_price: 120,
        last_cleaned_at: new Date('2024-06-01'),
        last_inspected_at: new Date('2024-06-01'),
        total_fill_count: Math.floor(Math.random() * 50) + 10,
        total_cleanings: Math.floor(Math.random() * 30) + 5,
        is_active: true,
      },
    })
    sampleGallons.push(gallon)
  }
  console.log('Created sample gallons:', sampleGallons.length)

  // Create Sample Customer
  const customer = await prisma.customer.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      customer_type: 'RETAIL',
      full_name: 'Jose Gonzales',
      phone: '+639177654321',
      email: 'jose.gonzales@email.com',
      credit_limit: 2000,
      current_balance: 0,
      loyalty_points: 150,
      loyalty_tier: 'Silver',
      status: 'active',
      created_by: adminUser.id,
    },
  })
  console.log('Created sample customer:', customer.full_name)

  // Create Customer Address
  await prisma.customerAddress.create({
    data: {
      customer_id: customer.id,
      label: 'Home',
      address_line: '456 Mabini Street',
      barangay: 'Poblacion',
      city: 'Makati City',
      region: 'NCR',
      postal_code: '1200',
      latitude: 14.5547,
      longitude: 121.0244,
      is_default: true,
    },
  })

  // Create Customer Tags
  await prisma.customerTag.create({
    data: {
      customer_id: customer.id,
      tag_name: 'VIP',
    },
  })

  // Create Sample Reseller
  const resellerCustomer = await prisma.customer.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      customer_type: 'RESELLER',
      full_name: 'ABC Store',
      company_name: 'ABC Store',
      phone: '+639188888888',
      email: 'abc.store@email.com',
      credit_limit: 10000,
      current_balance: 2500,
      loyalty_points: 500,
      loyalty_tier: 'Gold',
      status: 'active',
      created_by: adminUser.id,
    },
  })
  console.log('Created sample reseller customer:', resellerCustomer.full_name)

  await prisma.reseller.create({
    data: {
      customer_id: resellerCustomer.id,
      pricing_tier: 'wholesale',
      commission_rate: 5,
      credit_limit: 10000,
      status: 'active',
      approved_at: new Date(),
      approved_by: adminUser.id,
    },
  })

  // Create Sample Shift
  const shift = await prisma.shift.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      cashier_id: cashier.id,
      opening_cash: 5000,
      status: 'CLOSED',
      opened_at: new Date('2024-06-15T06:00:00Z'),
      closed_at: new Date('2024-06-15T21:00:00Z'),
      closing_cash_expected: 7500,
      closing_cash_actual: 7500,
      cash_variance: 0,
    },
  })
  console.log('Created sample shift')

  // Create Sample Sales Transaction
  const salesTransaction = await prisma.salesTransaction.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      shift_id: shift.id,
      customer_id: customer.id,
      invoice_number: '001-0001',
      invoice_type: 'OFFICIAL_RECEIPT',
      channel: 'pos',
      subtotal: 100,
      discount_total: 0,
      tax_total: 0,
      grand_total: 100,
      status: 'COMPLETED',
      created_by: cashier.id,
    },
  })
  console.log('Created sample sales transaction:', salesTransaction.invoice_number)

  // Create Sales Transaction Items
  await prisma.salesTransactionItem.create({
    data: {
      sales_transaction_id: salesTransaction.id,
      product_id: water5gRefill.id,
      quantity: 2,
      unit_price: 50,
      line_total: 100,
    },
  })

  // Create Sample Payment
  await prisma.payment.create({
    data: {
      tenant_id: tenant.id,
      sales_transaction_id: salesTransaction.id,
      customer_id: customer.id,
      payment_method: 'CASH',
      amount: 100,
      status: 'CONFIRMED',
      collected_by: cashier.id,
      paid_at: new Date('2024-06-15T10:30:00Z'),
      confirmed_at: new Date('2024-06-15T10:30:00Z'),
    },
  })

  // Create Sample Delivery Order
  const deliveryOrder = await prisma.deliveryOrder.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      customer_id: customer.id,
      address_id: (await prisma.customerAddress.findFirst({
        where: { customer_id: customer.id },
      }))!.id,
      order_type: 'ONE_TIME',
      requested_date: new Date('2024-06-16'),
      requested_time_slot: '09:00-12:00',
      status: 'PENDING',
      payment_method: 'CASH',
      payment_status: 'PENDING',
      special_instructions: 'Leave at gate if nobody is home',
    },
  })
  console.log('Created sample delivery order')

  // Create Delivery Order Items
  await prisma.deliveryOrderItem.create({
    data: {
      delivery_order_id: deliveryOrder.id,
      product_id: water5gRefill.id,
      quantity: 3,
      unit_price: 50,
    },
  })

  // Create Sample Equipment
  await prisma.equipment.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      name: 'RO Membrane Unit #1',
      type: 'RO_MEMBRANE',
      serial_number: 'RO-001-2024',
      model: 'RO-500GPD',
      manufacturer: 'AquaTech',
      installed_at: new Date('2024-01-01'),
      warranty_expires: new Date('2026-01-01'),
      status: 'active',
    },
  })

  await prisma.equipment.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      name: 'Sediment Filter #1',
      type: 'SEDIMENT_FILTER',
      serial_number: 'SF-001-2024',
      model: 'SF-20inch',
      manufacturer: 'FilterPro',
      installed_at: new Date('2024-01-01'),
      warranty_expires: new Date('2024-07-01'),
      status: 'active',
    },
  })

  // Create Sample Settings
  await prisma.setting.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      key: 'tax_rate',
      value: { rate: 0.12, inclusive: false },
      description: 'VAT rate configuration',
      updated_by: adminUser.id,
    },
  })

  await prisma.setting.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      key: 'container_deposit_default',
      value: { amount: 50, currency: 'PHP' },
      description: 'Default container deposit amount',
      updated_by: adminUser.id,
    },
  })

  await prisma.setting.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      key: 'credit_limit_default',
      value: { retail: 2000, reseller: 10000, corporate: 50000 },
      description: 'Default credit limits by customer type',
      updated_by: adminUser.id,
    },
  })

  await prisma.setting.create({
    data: {
      tenant_id: tenant.id,
      branch_id: branch.id,
      key: 'loyalty_earn_rate',
      value: { points_per_peso: 0.01, expiry_months: 12 },
      description: 'Loyalty points accrual rate',
      updated_by: adminUser.id,
    },
  })

  // Create Sample Notification Template
  await prisma.notificationTemplate.create({
    data: {
      tenant_id: tenant.id,
      code: 'ORDER_CONFIRMATION',
      channel: 'SMS',
      subject: 'Order Confirmed',
      body_template: 'Hi {customer_name}, your order #{order_id} has been confirmed. Expected delivery: {delivery_date}.',
      variables: ['customer_name', 'order_id', 'delivery_date'],
      is_active: true,
    },
  })

  await prisma.notificationTemplate.create({
    data: {
      tenant_id: tenant.id,
      code: 'PAYMENT_DUE',
      channel: 'SMS',
      subject: 'Payment Due Reminder',
      body_template: 'Hi {customer_name}, you have an outstanding balance of ₱{amount} due on {due_date}. Please settle to avoid service interruption.',
      variables: ['customer_name', 'amount', 'due_date'],
      is_active: true,
    },
  })

  // Create Sample Loyalty Tier
  await prisma.loyaltyTier.create({
    data: {
      tenant_id: tenant.id,
      name: 'Bronze',
      min_points: 0,
      points_multiplier: 1,
      benefits: {},
      is_active: true,
    },
  })

  await prisma.loyaltyTier.create({
    data: {
      tenant_id: tenant.id,
      name: 'Silver',
      min_points: 1000,
      points_multiplier: 1.2,
      benefits: { priority_delivery: false },
      is_active: true,
    },
  })

  await prisma.loyaltyTier.create({
    data: {
      tenant_id: tenant.id,
      name: 'Gold',
      min_points: 5000,
      points_multiplier: 1.5,
      benefits: { priority_delivery: true, free_delivery_threshold: 500 },
      is_active: true,
    },
  })

  await prisma.loyaltyTier.create({
    data: {
      tenant_id: tenant.id,
      name: 'Platinum',
      min_points: 20000,
      points_multiplier: 2,
      benefits: { priority_delivery: true, free_delivery: true, exclusive_offers: true },
      is_active: true,
    },
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
