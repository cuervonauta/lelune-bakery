const SENDER = { name: "Lelune Bakery's", email: 'no-reply@lelunebakery.cl' }
const OWNER_EMAIL = process.env.OWNER_EMAIL

async function send({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html })
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
}

export async function sendConfirmationToCustomer(order) {
  const rows = order.items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #F0E8C8;color:#2A1A00">
        ${i.qty > 1 ? `<strong>${i.qty}×</strong> ` : ''}${i.name}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #F0E8C8;text-align:right;font-weight:800;color:#2A1A00">
        $${(Number(i.price) * Number(i.qty)).toLocaleString('es-CL')}
      </td>
    </tr>`
  ).join('')

  const deliveryRow = order.delivery_type === 'envio'
    ? `<tr><td style="padding:8px 0;color:#6B5A3E">Despacho (RM)</td><td style="padding:8px 0;text-align:right;color:#6B5A3E">$${order.delivery_cost.toLocaleString('es-CL')}</td></tr>`
    : `<tr><td style="padding:8px 0;color:#6B5A3E">Retiro en local</td><td style="padding:8px 0;text-align:right;color:#52267E;font-weight:800">Gratis</td></tr>`

  const deliveryInfo = order.delivery_type === 'envio'
    ? `Coordinaremos el despacho a <strong>${order.delivery_address}</strong> por WhatsApp.`
    : `Coordinaremos la fecha de retiro en Calera de Tango por WhatsApp.`

  await send({
    to: order.customer_email,
    subject: `Pedido confirmado — ${order.order_number} 🍪`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FFFDF5;border-radius:16px;overflow:hidden;border:1px solid #F0E8C8">
        <div style="background:#FFCB03;padding:24px 32px;text-align:center">
          <p style="font-size:28px;font-weight:900;color:#2A1A00;margin:0">Lelune Bakery's 🌙</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#52267E;font-size:20px;margin:0 0 8px">¡Pedido confirmado! 🍪</h2>
          <p style="color:#6B5A3E;margin:0 0 24px">Hola <strong>${order.customer_name}</strong>, recibimos tu pago. Acá está el resumen:</p>
          <div style="background:white;border-radius:12px;padding:20px;border:1px solid #F0E8C8;margin-bottom:20px">
            <p style="font-size:11px;font-weight:800;text-transform:uppercase;color:#A08060;letter-spacing:.08em;margin:0 0 12px">Nº ${order.order_number}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${rows}
              ${deliveryRow}
              <tr>
                <td style="padding:12px 0 0;font-weight:900;color:#52267E;font-size:16px">Total pagado</td>
                <td style="padding:12px 0 0;text-align:right;font-weight:900;color:#52267E;font-size:16px">$${order.total.toLocaleString('es-CL')}</td>
              </tr>
            </table>
          </div>
          <div style="background:#FFF8DC;border:1px solid #FFDDA0;border-radius:12px;padding:16px;margin-bottom:20px;font-size:14px;color:#6B5A3E">
            📦 <strong>Próximo paso:</strong> ${deliveryInfo} Recuerda que los pedidos deben hacerse antes de las 6 PM para entrega al día siguiente (L–V).
          </div>
          <p style="font-size:13px;color:#A08060;text-align:center;margin:0">¿Dudas? <a href="https://wa.me/56950732322" style="color:#52267E;font-weight:700">Escríbenos por WhatsApp</a></p>
        </div>
      </div>`
  })
}

export async function sendNewOrderToOwner(order) {
  const itemsList = order.items
    .map(i => `• ${i.qty > 1 ? i.qty + '× ' : ''}${i.name} — $${(Number(i.price) * Number(i.qty)).toLocaleString('es-CL')}`)
    .join('\n')

  await send({
    to: OWNER_EMAIL,
    subject: `🍪 Nuevo pedido — ${order.order_number} ($${order.total.toLocaleString('es-CL')})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#52267E">🍪 Nuevo pedido pagado</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#888;width:120px">Número</td><td style="font-weight:700">${order.order_number}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Cliente</td><td>${order.customer_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td>${order.customer_email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Teléfono</td><td><a href="https://wa.me/56${order.customer_phone}" style="color:#52267E;font-weight:700">+56 ${order.customer_phone}</a></td></tr>
          <tr><td style="padding:6px 0;color:#888">Entrega</td><td>${order.delivery_type === 'envio' ? `Despacho → ${order.delivery_address}` : 'Retiro en Calera de Tango'}</td></tr>
          ${order.notes ? `<tr><td style="padding:6px 0;color:#888">Notas</td><td>${order.notes}</td></tr>` : ''}
          <tr><td style="padding:12px 0 0;color:#52267E;font-weight:900;font-size:16px">Total</td><td style="padding:12px 0 0;color:#52267E;font-weight:900;font-size:16px">$${order.total.toLocaleString('es-CL')}</td></tr>
        </table>
        <pre style="background:#f5f5f5;padding:12px;border-radius:8px;font-size:13px;white-space:pre-wrap">${itemsList}</pre>
      </div>`
  })
}
