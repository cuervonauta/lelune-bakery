import { MercadoPagoConfig, Preference } from 'mercadopago'

const DELIVERY_COST = 3500

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { items, customer, delivery } = req.body

  if (!items?.length || !customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  const preference = new Preference(client)
  const siteUrl = process.env.SITE_URL || 'https://lelunebakery.cl'

  const mpItems = items.map(item => ({
    title: String(item.name).slice(0, 256),
    quantity: Math.max(1, Number(item.qty)),
    unit_price: Number(item.price),
    currency_id: 'CLP'
  }))

  if (delivery?.type === 'envio') {
    mpItems.push({
      title: 'Despacho a domicilio — RM (Packet)',
      quantity: 1,
      unit_price: DELIVERY_COST,
      currency_id: 'CLP'
    })
  }

  try {
    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: customer.name,
          email: customer.email,
          phone: { area_code: '56', number: String(customer.phone) }
        },
        back_urls: {
          success: `${siteUrl}/success.html`,
          failure: `${siteUrl}/failure.html`,
          pending: `${siteUrl}/success.html`
        },
        auto_return: 'approved',
        statement_descriptor: 'LELUNE BAKERY',
        metadata: {
          delivery_type: delivery?.type || 'retiro',
          delivery_address: delivery?.address || '',
          notes: delivery?.notes || ''
        }
      }
    })

    res.status(200).json({ init_point: result.init_point })
  } catch (err) {
    console.error('MercadoPago error:', err?.message || err)
    res.status(500).json({ error: 'Error al crear preferencia de pago' })
  }
}
