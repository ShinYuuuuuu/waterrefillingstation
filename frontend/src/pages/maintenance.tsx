import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { useToast } from '@/components/ui/toast'
import { maintenanceService, type MaintenanceHistoryItem } from '@/services/maintenance.service'
import { FiCheck, FiPlus, FiTrash2, FiTool } from 'react-icons/fi'

function isMaintenanceNear(item: {
  triggerType: 'GALLONS' | 'DAYS'
  gallonInterval: number | null
  gallonsRemaining: number | null
  nextDueAt: string | null
  due: boolean
}) {
  if (item.due) return true
  if (item.triggerType === 'GALLONS') {
    return item.gallonInterval !== null
      && item.gallonsRemaining !== null
      && item.gallonsRemaining <= Math.max(1, Math.ceil(item.gallonInterval * 0.2))
  }
  if (!item.nextDueAt) return false
  const millisecondsRemaining = new Date(item.nextDueAt).getTime() - Date.now()
  return millisecondsRemaining <= 2 * 86400000
}

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<'GALLONS' | 'DAYS'>('GALLONS')
  const [interval, setInterval] = useState('250')
  const [nextDueAt, setNextDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const query = useQuery({ queryKey: ['maintenance'], queryFn: maintenanceService.list, refetchInterval: 60000 })
  const historyQuery = useQuery({ queryKey: ['maintenance', 'history'], queryFn: maintenanceService.history, refetchInterval: 60000 })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['maintenance'] })
  const create = useMutation({
    mutationFn: () => maintenanceService.create({ name: name.trim(), triggerType, gallonInterval: triggerType === 'GALLONS' ? Number(interval) : undefined, dayInterval: triggerType === 'DAYS' ? Number(interval) : undefined, nextDueAt: triggerType === 'DAYS' ? nextDueAt : undefined, notes: notes || undefined }),
    onSuccess: () => { refresh(); setOpen(false); setName(''); setNotes(''); addToast({ type: 'success', title: 'Maintenance schedule added' }) },
    onError: (error: any) => addToast({ type: 'error', title: error.response?.data?.error?.message ?? 'Could not add maintenance schedule' }),
  })
  const complete = useMutation({ mutationFn: maintenanceService.complete, onSuccess: () => { refresh(); addToast({ type: 'success', title: 'Maintenance recorded' }) } })
  const remove = useMutation({ mutationFn: maintenanceService.remove, onSuccess: refresh })

  return <PageLayout title="Maintenance" breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Maintenance' }]}>
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-gray-500">Total recorded refills: <strong>{query.data?.totalGallonsSold ?? 0}</strong></p>
        <Button onClick={() => setOpen(true)}><FiPlus /> Add Maintenance</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(query.data?.schedules ?? []).map((item) => {
          const upcoming = !item.due && isMaintenanceNear(item)
          return <Card key={item.id} className={item.due ? 'border-red-500' : upcoming ? 'border-yellow-500' : ''}>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between gap-2"><div className="flex items-center gap-2"><FiTool /><h3 className="font-semibold">{item.name}</h3></div><Badge variant={item.due ? 'danger' : upcoming ? 'warning' : 'success'}>{item.due ? 'Due' : upcoming ? 'Upcoming' : 'On schedule'}</Badge></div>
            {item.triggerType === 'GALLONS' ? <p className="text-sm">{item.gallonsSinceMaintenance} / {item.gallonInterval} refills since maintenance<br/><span className="text-gray-500">{item.gallonsRemaining} refills remaining</span></p> : <p className="text-sm">Every {item.dayInterval} days<br/><span className="text-gray-500">Next maintenance: {item.nextDueAt ? new Date(item.nextDueAt).toLocaleDateString() : 'Not scheduled'}</span></p>}
            {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
            <div className="flex gap-2">
              {isMaintenanceNear(item) && <Button size="sm" onClick={() => complete.mutate(item.id)}><FiCheck /> Mark performed</Button>}
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(item.id)}><FiTrash2 className="text-red-600" /></Button>
            </div>
          </CardContent>
        </Card>})}
      </div>
      {!query.isLoading && !(query.data?.schedules.length) && <p className="text-center text-gray-500 py-10">No maintenance schedules yet.</p>}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Maintenance Track Record</h2>
        <DataTable<MaintenanceHistoryItem>
          data={historyQuery.data ?? []}
          loading={historyQuery.isLoading}
          rowKey="id"
          emptyMessage="No maintenance has been performed yet."
          columns={[
            { key: 'maintenanceName', header: 'Maintenance' },
            { key: 'performedAt', header: 'Date Performed', render: item => new Date(item.performedAt).toLocaleString() },
            { key: 'performedBy', header: 'Performed By' },
            { key: 'gallonCountAtCompletion', header: 'Refills Recorded', render: item => item.gallonCountAtCompletion.toLocaleString() },
            { key: 'notes', header: 'Notes', render: item => item.notes || '—' },
          ]}
        />
      </div>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Add Maintenance Schedule">
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Part or maintenance name</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Example: Backwash" /></div>
        <div><label className="block text-sm font-medium mb-1">Schedule based on</label><Select value={triggerType} onChange={e => { const value=e.target.value as 'GALLONS'|'DAYS'; setTriggerType(value); setInterval(value === 'GALLONS' ? '250' : '30') }} options={[{ value:'GALLONS',label:'Number of refills (includes free refills)'},{value:'DAYS',label:'Calendar schedule'}]} /></div>
        {triggerType === 'DAYS' && <div><label className="block text-sm font-medium mb-1">Next maintenance date</label><Input type="date" value={nextDueAt} onChange={e => setNextDueAt(e.target.value)} /></div>}
        <div><label className="block text-sm font-medium mb-1">Repeat every how many {triggerType === 'GALLONS' ? 'refills' : 'days'}?</label><Input type="number" min="1" value={interval} onChange={e => setInterval(e.target.value)} /></div>
        <div><label className="block text-sm font-medium mb-1">Notes</label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.isPending} disabled={!name.trim() || Number(interval) < 1 || (triggerType === 'DAYS' && !nextDueAt)} onClick={() => create.mutate()}>Add</Button></div>
      </div>
    </Modal>
  </PageLayout>
}
