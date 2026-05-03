-- Lelune Bakery — Supabase Schema
-- Correr en: Supabase Dashboard → SQL Editor

CREATE TABLE orders (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     TEXT        UNIQUE NOT NULL,
  customer_name    TEXT        NOT NULL,
  customer_email   TEXT        NOT NULL,
  customer_phone   TEXT        NOT NULL,
  items            JSONB       NOT NULL,
  subtotal         INTEGER     NOT NULL,
  delivery_cost    INTEGER     NOT NULL DEFAULT 0,
  total            INTEGER     NOT NULL,
  delivery_type    TEXT        NOT NULL CHECK (delivery_type IN ('envio', 'retiro')),
  delivery_address TEXT,
  notes            TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending_payment'
                               CHECK (status IN ('pending_payment','paid','preparing','ready','delivered','cancelled')),
  mp_preference_id TEXT,
  mp_payment_id    TEXT,
  mp_payment_status TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes del panel admin (futuro)
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_email      ON orders(customer_email);

-- RLS: solo el service role puede leer/escribir (las API functions usan service role key)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
