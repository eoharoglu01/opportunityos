# OpportunityOS Database Schema

This document describes the Supabase database foundation for OpportunityOS.

## Overview

The schema is organized around catalog data and user personalization data.

### Core catalog tables
- categories: product groups such as phones, laptops, and accessories.
- stores: merchants or marketplaces that publish prices.
- products: individual product records linked to categories.
- product_prices: the latest available price of a product for a store.
- price_history: historical prices used for analytics and trend detection.

### User personalization tables
- profiles: one profile per authenticated Supabase user.
- favorites: products marked by a user.
- price_alerts: thresholds that notify a user when prices change.
- notifications: messages generated for a user.

## Relationships
- A product belongs to one category, but a category can have many products.
- A product can have many prices, one per store.
- A price history record belongs to one product and one store.
- A favorite belongs to one user and one product.
- A price alert belongs to one user and one product.
- A notification belongs to one user.

## Important fields
- UUID primary keys are used for all tables.
- created_at and updated_at timestamps are included on all tables.
- Prices use numeric(12,2) to preserve cents safely.
- currency stores the ISO-style currency code, such as TRY or USD.
- slug fields are included for SEO-friendly URLs.
- is_active flags support soft enabling or disabling of catalog rows.

## Security model
- Row Level Security (RLS) is enabled.
- Catalog tables are publicly readable.
- Users can only read and update their own profile.
- Users can only manage their own favorites.
- Users can only manage their own price alerts.
- Users can only read and update their own notifications.

## Planned environment variables
The following environment variables will be required when connecting the app to Supabase later:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_USE_SUPABASE=true

## Notes
- No demo data is included in this migration.
- The mock fallback remains available in the app and does not depend on this database.
