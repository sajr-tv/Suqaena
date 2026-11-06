# SUQAENA Mobile-First Plan

Target: assume 90% of visitors use mobile devices. Design at 320px, 375px, 390px, 430px first; then tablet and desktop.

## Shared architecture
- Responsive web storefront + installable PWA
- Android/iOS app clients later share the same secured API, product catalog, authentication, orders, inventory, pricing and customer profiles
- Customer registration: email/password, Google OAuth, verified phone where needed, password reset, rate limiting, session security
- Guest browsing; require login at checkout if product owner confirms
- Sticky mobile navigation, thumb-friendly buttons, compact product cards, quick filters, optimized images, accessible checkout
- GCC-specific address and phone validation; COD availability only where a courier contract is confirmed

## Delivery phases
1. Mobile-first design and PWA shell
2. PostgreSQL product catalog, admin tools and customer accounts
3. Inventory, cart, checkout and shipping integrations
4. Native mobile apps with shared backend, store testing and submission

Do not activate payment processing until trade licence, Stripe business profile, refund terms and courier COD settlements are verified.
