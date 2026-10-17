const trim = (value: string | undefined) => value?.trim() || undefined

export const env = {
  apiUrl: (trim(import.meta.env.VITE_API_URL) ?? 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL),
  supabasePublishableKey: trim(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  googleMapsApiKey: trim(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
  appVersion: __APP_VERSION__,
}
