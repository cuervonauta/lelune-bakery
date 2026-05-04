import { supabase } from './lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data ?? [])
}
