import { Router } from 'express'

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Water Station Management System API',
    version: '1.0.0',
    description: 'API documentation for the WSMS backend foundation',
    contact: {
      name: 'WSMS Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from POST /auth/login',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'owner@aquapure.com' },
          password: { type: 'string', example: 'admin123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              expiresIn: { type: 'number', example: 900 },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          tenantId: { type: 'string', example: 'uuid' },
          branchId: { type: 'string', nullable: true, example: 'uuid' },
          fullName: { type: 'string', example: 'Juan Dela Cruz' },
          email: { type: 'string', example: 'owner@aquapure.com' },
          role: { type: 'string', example: 'OWNER' },
        },
      },
      CustomerResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890' },
          tenantId: { type: 'string', example: 'uuid' },
          branchId: { type: 'string', example: 'uuid' },
          customerType: { type: 'string', enum: ['RETAIL', 'RESELLER', 'CORPORATE'], example: 'RETAIL' },
          fullName: { type: 'string', example: 'Maria Santos' },
          companyName: { type: 'string', nullable: true, example: 'Santos Water Trading' },
          phone: { type: 'string', example: '+639171234567' },
          email: { type: 'string', format: 'email', nullable: true, example: 'maria@example.com' },
          tin: { type: 'string', nullable: true, example: '010-123-456-789' },
          creditLimit: { type: 'number', format: 'float', example: 5000.0 },
          currentBalance: { type: 'number', format: 'float', example: 1200.5 },
          loyaltyPoints: { type: 'integer', example: 150 },
          loyaltyTier: { type: 'string', nullable: true, example: 'Silver' },
          status: { type: 'string', example: 'active' },
          metadata: { type: 'object', additionalProperties: true, nullable: true },
          createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
          createdBy: { type: 'string', nullable: true, example: 'user-uuid' },
        },
      },
      CreateCustomerRequest: {
        type: 'object',
        required: ['fullName', 'phone'],
        properties: {
          customerType: { type: 'string', enum: ['RETAIL', 'RESELLER', 'CORPORATE'], default: 'RETAIL' },
          fullName: { type: 'string', example: 'Maria Santos' },
          companyName: { type: 'string', nullable: true, example: 'Santos Water Trading' },
          phone: { type: 'string', example: '+639171234567' },
          email: { type: 'string', format: 'email', nullable: true, example: 'maria@example.com' },
          tin: { type: 'string', nullable: true, example: '010-123-456-789' },
          creditLimit: { type: 'number', format: 'float', example: 5000.0 },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      UpdateCustomerRequest: {
        type: 'object',
        properties: {
          customerType: { type: 'string', enum: ['RETAIL', 'RESELLER', 'CORPORATE'] },
          fullName: { type: 'string', example: 'Maria Santos-Reyes' },
          companyName: { type: 'string', nullable: true, example: 'Santos-Reyes Water Trading' },
          phone: { type: 'string', example: '+639177654321' },
          email: { type: 'string', format: 'email', nullable: true, example: 'maria.reyes@example.com' },
          tin: { type: 'string', nullable: true, example: '010-987-654-321' },
          creditLimit: { type: 'number', format: 'float', example: 8000.0 },
          currentBalance: { type: 'number', format: 'float', description: 'Use payment ledger to adjust — rejected via API' },
          loyaltyPoints: { type: 'integer', example: 200 },
          loyaltyTier: { type: 'string', nullable: true, example: 'Gold' },
          status: { type: 'string', example: 'active' },
          metadata: { type: 'object', additionalProperties: true, nullable: true },
        },
      },
      CustomerListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/CustomerResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      ProductResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'prod-uuid' },
          tenantId: { type: 'string', example: 'uuid' },
          categoryId: { type: 'string', example: 'uuid' },
          sku: { type: 'string', example: '5G-REFILL' },
          name: { type: 'string', example: '5-Gallon Purified Water' },
          description: { type: 'string', nullable: true, example: 'Standard purified water refill' },
          type: { type: 'string', enum: ['FINISHED_GOOD', 'RAW_MATERIAL', 'CONTAINER', 'ACCESSORY', 'SERVICE'], example: 'FINISHED_GOOD' },
          unitOfMeasure: { type: 'string', example: 'piece' },
          basePrice: { type: 'number', format: 'float', example: 55.0 },
          costPrice: { type: 'number', format: 'float', example: 25.5 },
          isContainer: { type: 'boolean', example: false },
          depositAmount: { type: 'number', format: 'float', nullable: true, example: 20.0 },
          reorderLevel: { type: 'integer', example: 100 },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string', nullable: true },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['categoryId', 'sku', 'name', 'type', 'unitOfMeasure', 'basePrice', 'costPrice'],
        properties: {
          categoryId: { type: 'string', format: 'uuid', example: 'uuid' },
          sku: { type: 'string', example: '5G-REFILL' },
          name: { type: 'string', example: '5-Gallon Purified Water' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['FINISHED_GOOD', 'RAW_MATERIAL', 'CONTAINER', 'ACCESSORY', 'SERVICE'] },
          unitOfMeasure: { type: 'string', example: 'piece' },
          basePrice: { type: 'number', format: 'float', example: 55.0 },
          costPrice: { type: 'number', format: 'float', example: 25.5 },
          isContainer: { type: 'boolean', default: false },
          depositAmount: { type: 'number', format: 'float', nullable: true },
          reorderLevel: { type: 'integer', default: 0 },
          isActive: { type: 'boolean', default: true },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['FINISHED_GOOD', 'RAW_MATERIAL', 'CONTAINER', 'ACCESSORY', 'SERVICE'] },
          unitOfMeasure: { type: 'string' },
          basePrice: { type: 'number', format: 'float' },
          costPrice: { type: 'number', format: 'float' },
          isContainer: { type: 'boolean' },
          depositAmount: { type: 'number', format: 'float', nullable: true },
          reorderLevel: { type: 'integer' },
          isActive: { type: 'boolean' },
          metadata: { type: 'object', additionalProperties: true, nullable: true },
        },
      },
      ProductListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      GallonResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'gallon-uuid' },
          tenantId: { type: 'string', example: 'uuid' },
          branchId: { type: 'string', example: 'uuid' },
          gallonTypeId: { type: 'string', format: 'uuid', example: 'uuid' },
          tagCode: { type: 'string', example: 'GAL-001234' },
          serialNumber: { type: 'string', nullable: true, example: 'SN-001234' },
          status: { type: 'string', enum: ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'], example: 'IN_STOCK' },
          currentHolderType: { type: 'string', nullable: true, example: 'branch' },
          currentHolderId: { type: 'string', nullable: true, format: 'uuid' },
          currentCondition: { type: 'string', nullable: true, example: 'good' },
          purchaseDate: { type: 'string', format: 'date-time', nullable: true, example: '2025-01-15T10:30:00.000Z' },
          purchasePrice: { type: 'number', format: 'float', nullable: true, example: 150.0 },
          lastCleanedAt: { type: 'string', format: 'date-time', nullable: true },
          lastInspectedAt: { type: 'string', format: 'date-time', nullable: true },
          lastFilledAt: { type: 'string', format: 'date-time', nullable: true },
          totalFillCount: { type: 'integer', example: 42 },
          totalCleanings: { type: 'integer', example: 15 },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateGallonRequest: {
        type: 'object',
        required: ['gallonTypeId', 'tagCode'],
        properties: {
          gallonTypeId: { type: 'string', format: 'uuid', example: 'uuid' },
          tagCode: { type: 'string', example: 'GAL-001234' },
          serialNumber: { type: 'string', nullable: true, example: 'SN-001234' },
          status: { type: 'string', enum: ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'], default: 'IN_STOCK' },
          holderType: { type: 'string', nullable: true, example: 'branch' },
          holderId: { type: 'string', nullable: true, format: 'uuid' },
          condition: { type: 'string', nullable: true, example: 'good' },
          purchaseDate: { type: 'string', format: 'date-time', nullable: true },
          purchasePrice: { type: 'number', format: 'float', nullable: true, example: 150.0 },
          isActive: { type: 'boolean', default: true },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      UpdateGallonRequest: {
        type: 'object',
        properties: {
          tagCode: { type: 'string', example: 'GAL-005678' },
          serialNumber: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'] },
          holderType: { type: 'string', nullable: true },
          holderId: { type: 'string', nullable: true, format: 'uuid' },
          condition: { type: 'string', nullable: true },
          purchasePrice: { type: 'number', format: 'float', nullable: true },
          isActive: { type: 'boolean' },
          metadata: { type: 'object', additionalProperties: true, nullable: true },
        },
      },
      GallonStatusUpdate: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'] },
          notes: { type: 'string', nullable: true, maxLength: 500 },
        },
      },
      GallonListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/GallonResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      BranchInventoryResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          quantityOnHand: { type: 'integer', example: 100 },
          reservedQuantity: { type: 'integer', example: 10 },
          availableQuantity: { type: 'integer', example: 90 },
          reorderLevel: { type: 'integer', example: 20 },
          reorderQuantity: { type: 'integer', example: 50 },
          lastCountedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateBranchInventoryRequest: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid', description: 'Optional; defaults to caller\'s branch' },
          quantityOnHand: { type: 'integer', example: 100, default: 0 },
          reservedQuantity: { type: 'integer', example: 0, default: 0 },
        },
      },
      UpdateBranchInventoryRequest: {
        type: 'object',
        properties: {
          quantityOnHand: { type: 'integer', example: 100 },
          reservedQuantity: { type: 'integer', example: 10 },
          lastCountedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      BranchInventoryListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/BranchInventoryResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      LowStockAlertResponse: {
        type: 'object',
        properties: {
          productId: { type: 'string', format: 'uuid' },
          productName: { type: 'string', example: '5-Gallon Purified Water' },
          branchId: { type: 'string', format: 'uuid' },
          branchName: { type: 'string', example: 'Main Branch' },
          quantityOnHand: { type: 'integer', example: 5 },
          reservedQuantity: { type: 'integer', example: 3 },
          availableQuantity: { type: 'integer', example: 2 },
          reorderLevel: { type: 'integer', example: 10 },
          reorderQuantity: { type: 'integer', example: 50 },
        },
      },
      ProductionBatchResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          batchNumber: { type: 'string', example: 'PB-2025-0001' },
          rawInputLiters: { type: 'number', format: 'float', nullable: true, example: 1000.0 },
          outputProductId: { type: 'string', format: 'uuid' },
          outputQuantity: { type: 'integer', example: 240 },
          operatorId: { type: 'string', format: 'uuid' },
          qualityCheckPassed: { type: 'boolean', example: true },
          qualityNotes: { type: 'string', nullable: true, example: 'All parameters within normal range' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProductionBatchRequest: {
        type: 'object',
        required: ['batchNumber', 'outputProductId', 'outputQuantity'],
        properties: {
          batchNumber: { type: 'string', example: 'PB-2025-0001' },
          outputProductId: { type: 'string', format: 'uuid' },
          outputQuantity: { type: 'integer', example: 240 },
          rawInputLiters: { type: 'number', format: 'float', nullable: true, example: 1000.0 },
          qualityCheckPassed: { type: 'boolean', default: false },
          qualityNotes: { type: 'string', nullable: true },
        },
      },
      ProductionBatchDetailsResponse: {
        type: 'object',
        allOf: [
          { $ref: '#/components/schemas/ProductionBatchResponse' },
          {
            type: 'object',
            properties: {
              ledgerEntries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    movementType: { type: 'string', enum: ['PRODUCTION', 'ADJUSTMENT'] },
                    quantityDelta: { type: 'integer' },
                    notes: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        ],
      },
      StockTransferResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          originBranchId: { type: 'string', format: 'uuid' },
          destinationBranchId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'DISCREPANCY', 'CANCELLED'] },
          requestedBy: { type: 'string', format: 'uuid' },
          approvedBy: { type: 'string', format: 'uuid', nullable: true },
          notes: { type: 'string', nullable: true },
          shippedAt: { type: 'string', format: 'date-time', nullable: true },
          receivedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                productId: { type: 'string', format: 'uuid' },
                containerId: { type: 'string', format: 'uuid', nullable: true },
                quantitySent: { type: 'integer' },
                quantityReceived: { type: 'integer', nullable: true },
                notes: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      CreateStockTransferRequest: {
        type: 'object',
        required: ['destinationBranchId', 'items'],
        properties: {
          destinationBranchId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', example: 10 },
                containerId: { type: 'string', format: 'uuid', nullable: true },
                notes: { type: 'string', nullable: true },
              },
            },
          },
          notes: { type: 'string', nullable: true },
        },
      },
      StockTransferListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/StockTransferResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      StockCountSessionResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED'] },
          initiatedBy: { type: 'string', format: 'uuid' },
          approvedBy: { type: 'string', format: 'uuid', nullable: true },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          submittedAt: { type: 'string', format: 'date-time', nullable: true },
          approvedAt: { type: 'string', format: 'date-time', nullable: true },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                productId: { type: 'string', format: 'uuid' },
                bookQuantity: { type: 'integer', example: 100 },
                countedQuantity: { type: 'integer', example: 95 },
                variance: { type: 'integer', example: -5 },
                varianceAmount: { type: 'number', format: 'float', nullable: true },
                notes: { type: 'string', nullable: true },
                adjustmentApproved: { type: 'boolean', example: false },
                approvedBy: { type: 'string', format: 'uuid', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      InventoryLedgerResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          movementType: { type: 'string', enum: ['SALE', 'PURCHASE', 'PRODUCTION', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'WRITE_OFF', 'RETURN', 'CLEANING', 'FILLING', 'INSPECTION'] },
          quantityDelta: { type: 'integer', example: 10 },
          referenceType: { type: 'string', nullable: true, example: 'StockTransfer' },
          referenceId: { type: 'string', format: 'uuid', nullable: true },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      InventoryAdjustmentResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: -5 },
          reason: { type: 'string', enum: ['DAMAGE', 'EXPIRED', 'LOST', 'MANUAL', 'OPENING_BALANCE'] },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      CreateInventoryAdjustmentRequest: {
        type: 'object',
        required: ['productId', 'quantity', 'reason'],
        properties: {
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: 5 },
          reason: { type: 'string', enum: ['DAMAGE', 'EXPIRED', 'LOST', 'MANUAL', 'OPENING_BALANCE'] },
          notes: { type: 'string', nullable: true },
        },
      },
      SaleResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'sale-uuid' },
          tenantId: { type: 'string', format: 'uuid', example: 'uuid' },
          branchId: { type: 'string', format: 'uuid', example: 'uuid' },
          customerId: { type: 'string', format: 'uuid', nullable: true, example: 'uuid' },
          invoiceNumber: { type: 'string', example: 'INV-2025-0001' },
          channel: { type: 'string', enum: ['IN_STORE', 'DELIVERY', 'RESELLER'], example: 'IN_STORE' },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED'], example: 'COMPLETED' },
          subtotal: { type: 'number', format: 'float', example: 500.0 },
          discountTotal: { type: 'number', format: 'float', example: 50.0 },
          taxTotal: { type: 'number', format: 'float', example: 0.0 },
          grandTotal: { type: 'number', format: 'float', example: 450.0 },
          amountTendered: { type: 'number', format: 'float', nullable: true, example: 500.0 },
          changeAmount: { type: 'number', format: 'float', nullable: true, example: 50.0 },
          voidReason: { type: 'string', nullable: true, example: 'Customer changed mind' },
          voidedAt: { type: 'string', format: 'date-time', nullable: true },
          voidedBy: { type: 'string', format: 'uuid', nullable: true },
          notes: { type: 'string', nullable: true, example: 'Rush order' },
          createdBy: { type: 'string', format: 'uuid', example: 'user-uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                saleId: { type: 'string', format: 'uuid' },
                productId: { type: 'string', format: 'uuid' },
                productName: { type: 'string', example: '5-Gallon Purified Water' },
                quantity: { type: 'integer', example: 2 },
                unitPrice: { type: 'number', format: 'float', example: 55.0 },
                discountAmount: { type: 'number', format: 'float', example: 10.0 },
                lineTotal: { type: 'number', format: 'float', example: 100.0 },
                isRefunded: { type: 'boolean', example: false },
                refundedQuantity: { type: 'integer', example: 0 },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          payments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                saleId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', format: 'float', example: 500.0 },
                method: { type: 'string', enum: ['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'ON_ACCOUNT'], example: 'CASH' },
                reference: { type: 'string', nullable: true, example: 'GCASH-REF-123' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      CreateSaleRequest: {
        type: 'object',
        required: ['channel', 'items', 'payments'],
        properties: {
          customerId: { type: 'string', format: 'uuid', nullable: true, example: 'uuid' },
          channel: { type: 'string', enum: ['IN_STORE', 'DELIVERY', 'RESELLER'], example: 'IN_STORE' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'productName', 'quantity', 'unitPrice'],
              properties: {
                productId: { type: 'string', format: 'uuid', example: 'uuid' },
                productName: { type: 'string', example: '5-Gallon Purified Water' },
                quantity: { type: 'integer', example: 2 },
                unitPrice: { type: 'number', format: 'float', example: 55.0 },
                discountAmount: { type: 'number', format: 'float', example: 10.0 },
              },
            },
          },
          payments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['amount', 'method'],
              properties: {
                amount: { type: 'number', format: 'float', example: 500.0 },
                method: { type: 'string', enum: ['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'ON_ACCOUNT'], example: 'CASH' },
                reference: { type: 'string', nullable: true, example: 'GCASH-REF-123' },
              },
            },
          },
          discountTotal: { type: 'number', format: 'float', example: 50.0 },
          taxTotal: { type: 'number', format: 'float', example: 0.0 },
          notes: { type: 'string', nullable: true, example: 'Rush order' },
        },
      },
      UpdateSaleRequest: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['IN_STORE', 'DELIVERY', 'RESELLER'] },
          notes: { type: 'string', nullable: true },
        },
      },
      RecordPaymentRequest: {
        type: 'object',
        required: ['amount', 'method'],
        properties: {
          amount: { type: 'number', format: 'float', example: 500.0 },
          method: { type: 'string', enum: ['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'ON_ACCOUNT'], example: 'CASH' },
          reference: { type: 'string', nullable: true, example: 'GCASH-REF-123' },
        },
      },
      VoidSaleRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', example: 'Customer changed mind' },
          approvalPin: { type: 'string', nullable: true, example: '1234' },
        },
      },
      DailySummaryResponse: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', example: '2025-01-15' },
          totalSales: { type: 'number', format: 'float', example: 5000.0 },
          totalTransactions: { type: 'integer', example: 25 },
          totalItemsSold: { type: 'integer', example: 150 },
          totalDiscount: { type: 'number', format: 'float', example: 200.0 },
          totalTax: { type: 'number', format: 'float', example: 0.0 },
          totalGrandTotal: { type: 'number', format: 'float', example: 4800.0 },
          totalCash: { type: 'number', format: 'float', example: 3000.0 },
          totalEwallet: { type: 'number', format: 'float', example: 1500.0 },
          totalOnAccount: { type: 'number', format: 'float', example: 300.0 },
          byChannel: {
            type: 'object',
            properties: {
              inStore: { type: 'number', format: 'float', example: 3000.0 },
              delivery: { type: 'number', format: 'float', example: 1500.0 },
              reseller: { type: 'number', format: 'float', example: 300.0 },
            },
          },
          byPaymentMethod: {
            type: 'object',
            properties: {
              cash: { type: 'number', format: 'float', example: 3000.0 },
              gcash: { type: 'number', format: 'float', example: 1000.0 },
              maya: { type: 'number', format: 'float', example: 500.0 },
              bankTransfer: { type: 'number', format: 'float', example: 0.0 },
              onAccount: { type: 'number', format: 'float', example: 300.0 },
            },
          },
        },
      },
      SaleListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/SaleResponse' },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
    },
  },
  security: [
    { bearerAuth: [] },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': {
            description: 'Too many login attempts',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'User registration',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName', 'roleCode'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  roleCode: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful',
          },
          '400': {
            description: 'Validation error',
          },
          '409': {
            description: 'Email already registered',
          },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        summary: 'Refresh access token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
          },
          '401': {
            description: 'Invalid or expired refresh token',
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout (invalidate refresh token)',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logout successful',
          },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        summary: 'Logout from all devices',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'All sessions invalidated',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user info',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User info',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List customers',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'customerType',
            in: 'query',
            schema: { type: 'string', enum: ['RETAIL', 'RESELLER', 'CORPORATE'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of customers',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CustomerListResponse' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCustomerRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Customer created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CustomerResponse' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Duplicate phone or email', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/customers/{customerId}': {
      get: {
        summary: 'Get a single customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Customer details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CustomerResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        summary: 'Update a customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCustomerRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated customer', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/CustomerResponse' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Cannot modify balance or insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Duplicate phone or email', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        summary: 'Soft-delete a customer',
        tags: ['Customers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '204': { description: 'Customer deleted' },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Customer not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Pre-condition failed (outstanding balance, active orders, unpaid invoices, installment plans)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List products',
        description: 'Retrieve a paginated list of products. Filterable by category, type, status, container flag. Searchable by SKU, name, and description.',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number for pagination' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Number of items per page' },
          { name: 'category', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by category (UUID)' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['FINISHED_GOOD', 'RAW_MATERIAL', 'CONTAINER', 'ACCESSORY', 'SERVICE'] }, description: 'Filter by product type' },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across SKU, name, description' },
          { name: 'isContainer', in: 'query', schema: { type: 'boolean' }, description: 'Filter by container products' },
        ],
        responses: {
          '200': {
            description: 'Paginated list of products',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductListResponse' },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a new product',
        description: 'Create a new product within the caller\'s tenant. SKU must be unique within the tenant. Container products require a deposit amount.',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/ProductResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Product with this SKU already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/products/{productId}': {
      get: {
        summary: 'Get a single product',
        description: 'Retrieve a single product by ID. Tenants can only access their own products.',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' },
        ],
        responses: {
          '200': {
            description: 'Product details',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/ProductResponse' } } },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        summary: 'Update a product',
        description: 'Update an existing product. Only provided fields are updated. SKU must remain unique within the tenant (excluding this record).',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProductRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Product updated successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/ProductResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Product with this SKU already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        summary: 'Soft-delete a product',
        description: 'Soft-delete a product (sets `deleted_at`). Fails if the product has active inventory or is referenced by active sales transactions.',
        tags: ['Products'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' },
        ],
        responses: {
          '204': { description: 'Product soft-deleted successfully' },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Pre-condition failed (active inventory, active sale references)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/gallons': {
      get: {
        summary: 'List gallons',
        description: 'Retrieve a paginated list of gallon assets. Filterable by status, isActive. Searchable by tag code and serial number.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number for pagination' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Number of items per page' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'] }, description: 'Filter by status' },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across tag code and serial number' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['created_at', 'updated_at', 'tag_code', 'status'], default: 'created_at' }, description: 'Sort field' },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, description: 'Sort direction' },
        ],
        responses: {
          '200': {
            description: 'Paginated list of gallons',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GallonListResponse' },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Register a new gallon',
        description: 'Register a new gallon asset. Tag code must be unique within the tenant. Serial number must also be unique if provided.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateGallonRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Gallon created successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/GallonResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Gallon with this tag code or serial number already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/gallons/{gallonId}': {
      get: {
        summary: 'Get a single gallon',
        description: 'Retrieve a single gallon asset by ID. Tenants can only access their own gallons.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'gallonId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Gallon UUID' },
        ],
        responses: {
          '200': {
            description: 'Gallon details',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/GallonResponse' } } },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Gallon not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        summary: 'Update a gallon',
        description: 'Update an existing gallon. Only provided fields are updated. Tag code must remain unique within the tenant (excluding this record). Status transitions are validated against lifecycle rules.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'gallonId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Gallon UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateGallonRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Gallon updated successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/GallonResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Gallon not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Gallon with this tag code already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Invalid status transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        summary: 'Soft-delete a gallon',
        description: 'Soft-delete a gallon (sets `deleted_at`). Cannot be reversed — use status updates for lifecycle changes.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'gallonId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Gallon UUID' },
        ],
        responses: {
          '204': { description: 'Gallon soft-deleted successfully' },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Gallon not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/gallons/{gallonId}/status': {
      patch: {
        summary: 'Update gallon status',
        description: 'Update a gallon\'s lifecycle status (e.g., IN_STOCK → WITH_CUSTOMER). Validates status transitions against lifecycle rules. Terminal statuses (RETIRED, LOST) cannot be left.',
        tags: ['Gallons'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'gallonId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Gallon UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GallonStatusUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Gallon status updated successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/GallonResponse' } } },
              },
            },
          },
          '400': { description: 'Invalid request (same status or missing field)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Gallon not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '422': { description: 'Invalid status transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales': {
      get: {
        summary: 'List sales',
        description: 'Retrieve a paginated list of sales transactions. Filterable by status, channel, customer, date range, and searchable by invoice number.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number for pagination' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Number of items per page' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED'] }, description: 'Filter by sale status' },
          { name: 'channel', in: 'query', schema: { type: 'string', enum: ['IN_STORE', 'DELIVERY', 'RESELLER'] }, description: 'Filter by sales channel' },
          { name: 'customerId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by customer UUID' },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Filter by start date' },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Filter by end date' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search across invoice number' },
        ],
        responses: {
          '200': {
            description: 'Paginated list of sales',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SaleListResponse' },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        summary: 'Create a new sale',
        description: 'Create a new sales transaction. Items and payments must be provided. Branch context is required.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSaleRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Sale created successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/SaleResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales/{saleId}': {
      get: {
        summary: 'Get a single sale',
        description: 'Retrieve sale details including items and payments. Tenants can only access their own sales.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        responses: {
          '200': {
            description: 'Sale details',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SaleResponse' } } },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        summary: 'Update a sale',
        description: 'Update an existing sale. Only provided fields are updated.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSaleRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sale updated successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SaleResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        summary: 'Soft-delete a sale',
        description: 'Soft-delete a sale (sets `deleted_at`).',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        responses: {
          '204': { description: 'Sale soft-deleted successfully' },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales/{saleId}/payment': {
      post: {
        summary: 'Record payment against a sale',
        description: 'Record an additional payment against an existing sale transaction.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordPaymentRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Payment recorded', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SalePaymentResponse' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales/{saleId}/void': {
      post: {
        summary: 'Void a sale transaction',
        description: 'Void a completed sale transaction. Requires void reason and optional approval PIN for manager override.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VoidSaleRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sale voided successfully',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SaleResponse' } } },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales/daily-summary': {
      get: {
        summary: 'Get daily sales summary',
        description: 'Retrieve aggregated sales totals for a given date and optional branch. Includes totals by channel and payment method.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date', example: '2025-01-15' }, description: 'Date for the summary (ISO format)' },
          { name: 'branchId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Branch UUID (optional for HQ users)' },
        ],
        responses: {
          '200': {
            description: 'Daily sales summary',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DailySummaryResponse' } } },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/sales/receipt/{saleId}': {
      get: {
        summary: 'Get sale receipt',
        description: 'Retrieve sale data formatted for receipt printing. Same data as GET /sales/{saleId}.',
        tags: ['Sales'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'saleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Sale UUID' },
        ],
        responses: {
          '200': {
            description: 'Sale receipt data',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SaleResponse' } } },
              },
            },
          },
          '401': { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Sale not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
}

export const swaggerRouter = Router()

swaggerRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(swaggerSpec)
})

swaggerRouter.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WSMS API Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #666; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
    pre { background: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto; }
    .endpoint { background: #fafafa; border-left: 4px solid #007bff; padding: 10px 15px; margin: 10px 0; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .method.get { background: #28a745; color: white; }
    .method.post { background: #007bff; color: white; }
    .method.put { background: #ffc107; color: black; }
    .method.delete { background: #dc3545; color: white; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Water Station Management System API</h1>
    <p>Version 1.0.0 | <a href="/openapi.json">OpenAPI JSON</a></p>

    <h2>Authentication Endpoints</h2>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/auth/login</code>
      <p>Authenticate a user and receive JWT tokens.</p>
      <p><strong>Request body:</strong> <code>{ "email": "string", "password": "string" }</code></p>
      <p><strong>Response:</strong> <code>{ "success": true, "data": { "accessToken": "string", "refreshToken": "string", "expiresIn": number } }</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/auth/register</code>
      <p>Register a new user account.</p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/auth/refresh-token</code>
      <p>Refresh an expired access token using a valid refresh token.</p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/auth/logout</code>
      <p>Invalidate the current refresh token. Requires authentication.</p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/auth/logout-all</code>
      <p>Invalidate all refresh tokens for the current user. Requires authentication.</p>
    </div>

     <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/auth/me</code>
      <p>Get the current authenticated user's information. Requires authentication.</p>
    </div>

    <h2>Customer Management</h2>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/customers</code>
      <p>Retrieve a paginated list of customers. Supports search, filtering by type/status, and sorting.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>customerType</code>, <code>status</code>, <code>search</code></p>
      <p><strong>Permissions:</strong> <code>customers.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/customers</code>
      <p>Create a new customer with tenant and branch scoping.</p>
      <p><strong>Request body:</strong> <code>{ "fullName": "string", "phone": "string", "customerType": "RETAIL" }</code></p>
      <p><strong>Permissions:</strong> <code>customers.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/customers/{customerId}</code>
      <p>Retrieve details of a specific customer.</p>
      <p><strong>Permissions:</strong> <code>customers.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method put">PUT</span> <code>/api/v1/customers/{customerId}</code>
      <p>Update an existing customer. Balance adjustments must go through the payment ledger.</p>
      <p><strong>Permissions:</strong> <code>customers.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method delete">DELETE</span> <code>/api/v1/customers/{customerId}</code>
      <p>Soft-delete a customer. Fails if the customer has outstanding balance, active delivery orders, unpaid invoices, or active installment plans.</p>
      <p><strong>Permissions:</strong> <code>customers.delete</code></p>
    </div>

    <h2>Product Management</h2>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/products</code>
      <p>Retrieve a paginated list of products. Supports search, filtering by category/type/status/container flag, and sorting.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>category</code>, <code>type</code>, <code>isActive</code>, <code>search</code>, <code>isContainer</code></p>
      <p><strong>Permissions:</strong> <code>products.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/products</code>
      <p>Create a new product. SKU must be unique within the tenant. Container products require a deposit amount.</p>
      <p><strong>Request body:</strong> <code>{ "sku": "5G-REFILL", "name": "5-Gallon Purified Water", "type": "FINISHED_GOOD", "categoryId": "uuid", "basePrice": 55.0, "costPrice": 25.5, "unitOfMeasure": "piece" }</code></p>
      <p><strong>Permissions:</strong> <code>products.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/products/{productId}</code>
      <p>Retrieve details of a specific product.</p>
      <p><strong>Permissions:</strong> <code>products.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method put">PUT</span> <code>/api/v1/products/{productId}</code>
      <p>Update an existing product. Only provided fields are updated.</p>
      <p><strong>Permissions:</strong> <code>products.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method delete">DELETE</span> <code>/api/v1/products/{productId}</code>
      <p>Soft-delete a product. Fails if the product has active inventory or is referenced by active sales.</p>
      <p><strong>Permissions:</strong> <code>products.delete</code></p>
    </div>

    <h2>Gallon Asset Management</h2>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/gallons</code>
      <p>Retrieve a paginated list of gallon assets. Supports search, filtering by status/isActive, and sorting.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>status</code>, <code>isActive</code>, <code>search</code>, <code>sortBy</code>, <code>sortOrder</code></p>
      <p><strong>Permissions:</strong> <code>gallons.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/gallons</code>
      <p>Register a new gallon asset. Tag code must be unique within the tenant.</p>
      <p><strong>Request body:</strong> <code>{ "gallonTypeId": "uuid", "tagCode": "GAL-001234", "status": "IN_STOCK" }</code></p>
      <p><strong>Permissions:</strong> <code>gallons.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/gallons/{gallonId}</code>
      <p>Retrieve details of a specific gallon.</p>
      <p><strong>Permissions:</strong> <code>gallons.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method put">PUT</span> <code>/api/v1/gallons/{gallonId}</code>
      <p>Update an existing gallon. Status transitions are validated against lifecycle rules.</p>
      <p><strong>Permissions:</strong> <code>gallons.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method patch">PATCH</span> <code>/api/v1/gallons/{gallonId}/status</code>
      <p>Update a gallon's lifecycle status. Cannot leave terminal statuses (RETIRED, LOST).</p>
      <p><strong>Request body:</strong> <code>{ "status": "WITH_CUSTOMER", "notes": "optional" }</code></p>
      <p><strong>Permissions:</strong> <code>gallons.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method delete">DELETE</span> <code>/api/v1/gallons/{gallonId}</code>
      <p>Soft-delete a gallon asset.</p>
      <p><strong>Permissions:</strong> <code>gallons.delete</code></p>
    </div>

    <h2>Inventory Management</h2>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/branch</code>
      <p>Retrieve a paginated list of branch inventory. Supports search, filtering by product, and low-stock flag.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>productId</code>, <code>search</code>, <code>lowStock</code></p>
      <p><strong>Permissions:</strong> <code>products.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/branch</code>
      <p>Create or update branch inventory for a product.</p>
      <p><strong>Request body:</strong> <code>{ "productId": "uuid", "quantityOnHand": 100 }</code></p>
      <p><strong>Permissions:</strong> <code>products.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method put">PUT</span> <code>/api/v1/inventory/branch/{inventoryId}</code>
      <p>Update an existing branch inventory record.</p>
      <p><strong>Permissions:</strong> <code>products.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method delete">DELETE</span> <code>/api/v1/inventory/branch/{inventoryId}</code>
      <p>Soft-delete a branch inventory record.</p>
      <p><strong>Permissions:</strong> <code>products.delete</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/alerts/low-stock</code>
      <p>List all products with available_quantity <= reorder_level.</p>
      <p><strong>Query params:</strong> <code>branchId</code> (optional, for HQ users)</p>
      <p><strong>Permissions:</strong> <code>inventory.alerts.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/ledger</code>
      <p>List inventory ledger entries with filtering by product, movement type, and date range.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>productId</code>, <code>movementType</code>, <code>startDate</code>, <code>endDate</code></p>
      <p><strong>Permissions:</strong> <code>inventory.ledger.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/production-batches</code>
      <p>List production batches with filtering by status and search.</p>
      <p><strong>Permissions:</strong> <code>inventory.production.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/production-batches</code>
      <p>Create a new production batch. Creates a ledger entry for the production movement.</p>
      <p><strong>Request body:</strong> <code>{ "batchNumber": "PB-2025-0001", "outputProductId": "uuid", "outputQuantity": 240 }</code></p>
      <p><strong>Permissions:</strong> <code>inventory.production.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/production-batches/{batchId}</code>
      <p>Get production batch details including ledger entries.</p>
      <p><strong>Permissions:</strong> <code>inventory.production.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method patch">PATCH</span> <code>/api/v1/inventory/production-batches/{batchId}/complete</code>
      <p>Mark a production batch as completed.</p>
      <p><strong>Permissions:</strong> <code>inventory.production.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/stock-transfers</code>
      <p>List stock transfers with filtering by status.</p>
      <p><strong>Permissions:</strong> <code>inventory.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-transfers</code>
      <p>Create a new stock transfer (status: Draft). Requires sufficient stock at origin.</p>
      <p><strong>Request body:</strong> <code>{ "destinationBranchId": "uuid", "items": [{ "productId": "uuid", "quantity": 10 }] }</code></p>
      <p><strong>Permissions:</strong> <code>inventory.transfer.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method patch">PATCH</span> <code>/api/v1/inventory/stock-transfers/{transferId}/status</code>
      <p>Update stock transfer status. Workflow: PENDING → APPROVED → IN_TRANSIT → RECEIVED.</p>
      <p><strong>Request body:</strong> <code>{ "status": "APPROVED" }</code></p>
      <p><strong>Permissions:</strong> <code>inventory.transfer.approve</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-counts</code>
      <p>Create a new stock count session (status: OPEN). Only one open session per branch.</p>
      <p><strong>Permissions:</strong> <code>inventory.stock_count.start</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/stock-counts/{sessionId}</code>
      <p>Get a stock count session with its items.</p>
      <p><strong>Permissions:</strong> <code>inventory.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-counts/{sessionId}/items</code>
      <p>Record counted quantities for a stock count session.</p>
      <p><strong>Permissions:</strong> <code>inventory.stock_count.start</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-counts/{sessionId}/calculate</code>
      <p>Calculate variance for all items in a stock count session.</p>
      <p><strong>Permissions:</strong> <code>inventory.stock_count.approve</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-counts/{sessionId}/submit</code>
      <p>Submit a stock count session for approval (status: OPEN → SUBMITTED).</p>
      <p><strong>Permissions:</strong> <code>inventory.stock_count.start</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/stock-counts/{sessionId}/approve</code>
      <p>Approve a submitted stock count and post inventory adjustments. Status: SUBMITTED → APPROVED.</p>
      <p><strong>Permissions:</strong> <code>inventory.stock_count.approve</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/inventory/adjustments</code>
      <p>Create an inventory adjustment. Reasons: DAMAGE, EXPIRED, LOST, MANUAL, OPENING_BALANCE. Prevents negative inventory.</p>
      <p><strong>Request body:</strong> <code>{ "productId": "uuid", "quantity": 5, "reason": "DAMAGE" }</code></p>
      <p><strong>Permissions:</strong> <code>inventory.adjust</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/inventory/adjustments</code>
      <p>List inventory adjustment history (from ledger ADJUSTMENT entries).</p>
      <p><strong>Permissions:</strong> <code>inventory.read</code></p>
    </div>

    <h2>Sales & POS</h2>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/sales</code>
      <p>Retrieve a paginated list of sales transactions. Supports filtering by status, channel, customer, date range, and search by invoice number.</p>
      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>status</code>, <code>channel</code>, <code>customerId</code>, <code>startDate</code>, <code>endDate</code>, <code>search</code></p>
      <p><strong>Permissions:</strong> <code>sales.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/sales</code>
      <p>Create a new sales transaction. Items and payments must be provided. Branch context is required.</p>
      <p><strong>Request body:</strong> <code>{ "channel": "IN_STORE", "items": [...], "payments": [...] }</code></p>
      <p><strong>Permissions:</strong> <code>sales.create</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/sales/{saleId}</code>
      <p>Retrieve details of a specific sale including items and payments.</p>
      <p><strong>Permissions:</strong> <code>sales.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method put">PUT</span> <code>/api/v1/sales/{saleId}</code>
      <p>Update an existing sale. Only provided fields are updated.</p>
      <p><strong>Permissions:</strong> <code>sales.update</code></p>
    </div>

    <div class="endpoint">
      <span class="method delete">DELETE</span> <code>/api/v1/sales/{saleId}</code>
      <p>Soft-delete a sale transaction.</p>
      <p><strong>Permissions:</strong> <code>sales.delete</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/sales/{saleId}/payment</code>
      <p>Record an additional payment against an existing sale transaction.</p>
      <p><strong>Request body:</strong> <code>{ "amount": 500.0, "method": "CASH" }</code></p>
      <p><strong>Permissions:</strong> <code>sales.payment</code></p>
    </div>

    <div class="endpoint">
      <span class="method post">POST</span> <code>/api/v1/sales/{saleId}/void</code>
      <p>Void a completed sale transaction. Requires void reason.</p>
      <p><strong>Request body:</strong> <code>{ "reason": "Customer changed mind" }</code></p>
      <p><strong>Permissions:</strong> <code>sales.void</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/sales/daily-summary</code>
      <p>Retrieve aggregated sales totals for a given date and optional branch. Includes totals by channel and payment method.</p>
      <p><strong>Query params:</strong> <code>date</code>, <code>branchId</code></p>
      <p><strong>Permissions:</strong> <code>sales.read</code></p>
    </div>

    <div class="endpoint">
      <span class="method get">GET</span> <code>/api/v1/sales/receipt/{saleId}</code>
      <p>Retrieve sale data formatted for receipt printing.</p>
      <p><strong>Permissions:</strong> <code>sales.read</code></p>
    </div>

    <h2>Security</h2>
    <ul>
      <li>All authenticated endpoints use Bearer JWT tokens</li>
      <li>Access tokens expire in 15 minutes</li>
      <li>Refresh tokens expire in 7 days</li>
      <li>Rate limiting: 100 requests per 15 minutes (general), 5 attempts per 15 minutes (login)</li>
      <li>Password hashing: bcrypt with 10 rounds</li>
      <li>Tenant isolation enforced on all data access</li>
    </ul>
  </div>
</body>
</html>`)
})