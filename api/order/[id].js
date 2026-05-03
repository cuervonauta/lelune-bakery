import { supabase } from '../lib/supabase.js'

const STATUS_LABELS = {
  pending_payment: 'Esperando pago',
  paid: 'Pago confirmado',
  preparing: 'Preparando tu pedido 🍪',
  ready: '¡Listo para entrega!',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { id } = req.query

  const { data, error } = await supabase
    .from('orders')
    .select('order_number, status, delivery_type, total, created_at')
    .eq('order_number', id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Pedido no encontrado' })

  res.status(200).json({
    ...data,
    status_label: STATUS_LABELS[data.status] ?? data.status
  })
}
