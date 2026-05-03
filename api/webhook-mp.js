import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createHmac } from 'crypto'
import { supabase } from './lib/supabase.js'
import { sendConfirmationToCustomer, sendNewOrderToOwner } from './lib/brevo.js'

function verifySignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // saltar verificación en dev sin secret

  const signature = req.headers['x-signature'] ?? ''
  const requestId = req.headers['x-request-id'] ?? ''

  const ts = signature.match(/ts=([^,]+)/)?.[1]
  const v1 = signature.match(/v1=([^,]+)/)?.[1]
  if (!ts || !v1) return false

  const manifest = `id:${req.body?.data?.id};request-id:${requestId};ts:${ts};`
  const hmac = createHmac('sha256', secret).update(manifest).digest('hex')
  return hmac === v1
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // MP requiere 200 inmediato para no reintentar
  res.status(200).end()

  if (!verifySignature(req)) {
    console.error('Webhook: firma inválida')
    return
  }

  const { type, data } = req.body ?? {}
  if (type !== 'payment' || !data?.id) return

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
    const paymentData = await new Payment(client).get({ id: data.id })

    const orderNumber = paymentData.external_reference
    if (!orderNumber) return

    if (paymentData.status === 'approved') {
      const { data: rows } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          mp_payment_id: String(paymentData.id),
          mp_payment_status: paymentData.status
        })
        .eq('order_number', orderNumber)
        .eq('status', 'pending_payment') // idempotencia: solo actualizar una vez
        .select()

      if (rows?.[0]) {
        await Promise.allSettled([
          sendConfirmationToCustomer(rows[0]),
          sendNewOrderToOwner(rows[0])
        ])
      }

    } else if (['rejected', 'cancelled'].includes(paymentData.status)) {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', mp_payment_status: paymentData.status })
        .eq('order_number', orderNumber)
    }

  } catch (err) {
    console.error('Webhook error:', err?.message ?? err)
  }
}
