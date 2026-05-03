import { MercadoPagoConfig, Preference } from 'mercadopago'
import { supabase } from './lib/supabase.js'
import { generateOrderNumber, buildOrder, buildMpItems } from './lib/orders.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { items, customer, delivery } = req.body ?? {}

  if (!items?.length || !customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const orderNumber = generateOrderNumber()
  const order = buildOrder({ orderNumber, customer, items, delivery })

  // 1. Guardar orden en Supabase (status: pending_payment)
  const { error: dbError } = await supabase.from('orders').insert(order)
  if (dbError) {
    console.error('Supabase insert error:', dbError.message)
    return res.status(500).json({ error: 'Error al registrar el pedido' })
  }

  // 2. Crear Preference en MercadoPago
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  const siteUrl = process.env.SITE_URL

  try {
    const result = await new Preference(client).create({
      body: {
        external_reference: orderNumber,
        items: buildMpItems(items, delivery?.type),
        payer: {
          name: customer.name,
          email: customer.email,
          phone: { area_code: '56', number: String(customer.phone) }
        },
        back_urls: {
          success: `${siteUrl}/success.html?order=${orderNumber}`,
          failure: `${siteUrl}/failure.html?order=${orderNumber}`,
          pending: `${siteUrl}/success.html?order=${orderNumber}`
        },
        auto_return: 'approved',
        statement_descriptor: 'LELUNE BAKERY',
        notification_url: `${siteUrl}/api/webhook-mp`
      }
    })

    // 3. Guardar preference ID en la orden
    await supabase
      .from('orders')
      .update({ mp_preference_id: result.id })
      .eq('order_number', orderNumber)

    return res.status(200).json({ init_point: result.init_point, order_number: orderNumber })

  } catch (err) {
    console.error('MercadoPago error:', err?.message ?? err)
    // Revertir la orden si MP falla
    await supabase.from('orders').delete().eq('order_number', orderNumber)
    return res.status(500).json({ error: 'Error al crear la preferencia de pago' })
  }
}
