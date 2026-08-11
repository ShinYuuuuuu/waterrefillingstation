import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../database'
import { authenticateToken, requireRole } from '../../middleware/authJwt'
import { AppError } from '../../middleware/errorHandler'
import { successResponse } from '../../utils/response'

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  triggerType: z.enum(['GALLONS', 'DAYS']),
  gallonInterval: z.number().int().positive().optional(),
  dayInterval: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.triggerType === 'GALLONS' && !value.gallonInterval) ctx.addIssue({ code: 'custom', message: 'Gallon interval is required', path: ['gallonInterval'] })
  if (value.triggerType === 'DAYS' && !value.dayInterval) ctx.addIssue({ code: 'custom', message: 'Day interval is required', path: ['dayInterval'] })
})

async function getContext(req: Request) {
  if (!req.tenantId || !req.userId) throw new AppError(401, 'Authentication required')
  const branchId = req.branchId ?? (await prisma.branch.findFirst({ where: { tenant_id: req.tenantId, is_active: true } }))?.id
  if (!branchId) throw new AppError(400, 'No active branch configured')
  return { tenantId: req.tenantId, userId: req.userId, branchId }
}

async function totalGallons(tenantId: string, branchId: string) {
  const result = await prisma.salesTransactionItem.aggregate({
    _sum: { quantity: true },
    where: {
      deleted_at: null,
      product: { unit_of_measure: { equals: 'gallon', mode: 'insensitive' }, is_container: false },
      sales_transaction: { tenant_id: tenantId, branch_id: branchId, status: 'COMPLETED', deleted_at: null },
    },
  })
  return result._sum.quantity ?? 0
}

function mapSchedule(schedule: any, gallonsSold: number) {
  const gallonsSince = Math.max(0, gallonsSold - schedule.baseline_gallons)
  const baseDate = schedule.last_completed_at ?? schedule.created_at
  const nextDueAt = schedule.day_interval ? new Date(baseDate.getTime() + schedule.day_interval * 86400000) : null
  const due = schedule.trigger_type === 'GALLONS'
    ? gallonsSince >= (schedule.gallon_interval ?? Number.MAX_SAFE_INTEGER)
    : Boolean(nextDueAt && nextDueAt <= new Date())
  return {
    id: schedule.id, name: schedule.name, triggerType: schedule.trigger_type,
    gallonInterval: schedule.gallon_interval, dayInterval: schedule.day_interval,
    gallonsSinceMaintenance: gallonsSince, gallonsRemaining: schedule.gallon_interval ? Math.max(0, schedule.gallon_interval - gallonsSince) : null,
    lastCompletedAt: schedule.last_completed_at?.toISOString() ?? null, nextDueAt: nextDueAt?.toISOString() ?? null,
    notes: schedule.notes, isActive: schedule.is_active, due,
  }
}

export const maintenanceRoutes = Router()
maintenanceRoutes.use(authenticateToken, requireRole('owner', 'super_admin'))

maintenanceRoutes.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await getContext(req)
    const completions = await prisma.maintenanceCompletion.findMany({
      where: {
        tenant_id: ctx.tenantId,
        schedule: { branch_id: ctx.branchId },
      },
      include: { schedule: { select: { name: true } } },
      orderBy: { performed_at: 'desc' },
      take: 100,
    })
    const performerIds = [...new Set(completions.map((item: any) => item.performed_by))]
    const performers = await prisma.user.findMany({
      where: { tenant_id: ctx.tenantId, id: { in: performerIds } },
      select: { id: true, full_name: true },
    })
    const performerNames = new Map(performers.map((user: any) => [user.id, user.full_name]))

    res.json(successResponse(completions.map((item: any) => ({
      id: item.id,
      scheduleId: item.schedule_id,
      maintenanceName: item.schedule.name,
      performedBy: performerNames.get(item.performed_by) ?? 'Unknown user',
      performedAt: item.performed_at.toISOString(),
      gallonCountAtCompletion: item.gallon_count_at_completion,
      notes: item.notes,
    }))))
  } catch (error) { next(error) }
})

maintenanceRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await getContext(req)
    const [schedules, gallons] = await Promise.all([
      prisma.maintenanceSchedule.findMany({ where: { tenant_id: ctx.tenantId, branch_id: ctx.branchId, is_active: true }, orderBy: { created_at: 'desc' } }),
      totalGallons(ctx.tenantId, ctx.branchId),
    ])
    res.json(successResponse({ totalGallonsSold: gallons, schedules: schedules.map((item: any) => mapSchedule(item, gallons)) }))
  } catch (error) { next(error) }
})

maintenanceRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid maintenance schedule')
    const ctx = await getContext(req)
    const gallons = await totalGallons(ctx.tenantId, ctx.branchId)
    const created = await prisma.maintenanceSchedule.create({ data: {
      tenant_id: ctx.tenantId, branch_id: ctx.branchId, created_by: ctx.userId,
      name: parsed.data.name, trigger_type: parsed.data.triggerType,
      gallon_interval: parsed.data.gallonInterval, day_interval: parsed.data.dayInterval,
      baseline_gallons: gallons, notes: parsed.data.notes,
    } })
    res.status(201).json(successResponse(mapSchedule(created, gallons)))
  } catch (error) { next(error) }
})

maintenanceRoutes.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await getContext(req)
    const schedule = await prisma.maintenanceSchedule.findFirst({ where: { id: req.params.id, tenant_id: ctx.tenantId, branch_id: ctx.branchId, is_active: true } })
    if (!schedule) throw new AppError(404, 'Maintenance schedule not found')
    const gallons = await totalGallons(ctx.tenantId, ctx.branchId)
    const now = new Date()
    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.maintenanceCompletion.create({ data: { tenant_id: ctx.tenantId, schedule_id: schedule.id, performed_by: ctx.userId, performed_at: now, gallon_count_at_completion: gallons, notes: req.body?.notes ?? null } })
      return tx.maintenanceSchedule.update({ where: { id: schedule.id }, data: { baseline_gallons: gallons, last_completed_at: now, updated_at: now } })
    })
    res.json(successResponse(mapSchedule(updated, gallons)))
  } catch (error) { next(error) }
})

maintenanceRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await getContext(req)
    const result = await prisma.maintenanceSchedule.updateMany({ where: { id: req.params.id, tenant_id: ctx.tenantId, branch_id: ctx.branchId }, data: { is_active: false, updated_at: new Date() } })
    if (!result.count) throw new AppError(404, 'Maintenance schedule not found')
    res.json(successResponse({ message: 'Maintenance schedule removed' }))
  } catch (error) { next(error) }
})
