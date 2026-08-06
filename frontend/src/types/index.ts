export type UserRole = 'OWNER' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_STAFF' | 'RIDER' | 'DISPATCHER' | 'ACCOUNTANT' | 'RESELLER' | 'CUSTOMER' | 'TECHNICIAN' | 'SUPER_ADMIN'

export type CustomerType = 'RETAIL' | 'RESELLER' | 'CORPORATE'

export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED'

export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CARD' | 'CHECK' | 'CREDIT'

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECONCILED' | 'DISPUTED'

export type ContainerStatus = 'IN_STOCK' | 'WITH_CUSTOMER' | 'WITH_RIDER' | 'WITH_RESELLER' | 'DAMAGED' | 'LOST' | 'RETIRED'

export type ProductType = 'FINISHED_GOOD' | 'RAW_MATERIAL' | 'CONTAINER' | 'ACCESSORY' | 'SERVICE'
