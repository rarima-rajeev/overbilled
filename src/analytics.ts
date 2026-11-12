import posthog from 'posthog-js'

// Visitor analytics. The PostHog project key is public by design (it ships in browser code).
posthog.init('phc_A7AQUNuHDWgP92hxthbkLJE53fGP2VnVBM3EbGgW9tKy', {
  api_host: 'https://us.i.posthog.com',
  defaults: '2025-05-24', // page views and page leaves, including client-side navigation
  person_profiles: 'identified_only', // visitors stay anonymous
})
