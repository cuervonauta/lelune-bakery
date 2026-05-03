export const DELIVERY_COST = 3500

export function generateOrderNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `LB-${year}${month}-${random}`
}

export function buildOrder({ orderNumber, customer, items, delivery }) {
  const subtotal = items.reduce((s, item) => s + Number(item.price) * Number(item.qty), 0)
  const deliveryCost = delivery.type === 'envio' ? DELIVERY_COST : 0
  return {
    order_number: orderNumber,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    items,
    subtotal,
    delivery_cost: deliveryCost,
    total: subtotal + deliveryCost,
    delivery_type: delivery.type,
    delivery_address: delivery.address || null,
    notes: delivery.notes || null,
    status: 'pending_payment'
  }
}

export function buildMpItems(items, deliveryType) {
  const mpItems = items.map(item => ({
    title: String(item.name).slice(0, 256),
    quantity: Math.max(1, Number(item.qty)),
    unit_price: Number(item.price),
    currency_id: 'CLP'
  }))
  if (deliveryType === 'envio') {
    mpItems.push({
      title: 'Despacho a domicilio — RM',
      quantity: 1,
      unit_price: DELIVERY_COST,
      currency_id: 'CLP'
    })
  }
  return mpItems
}
