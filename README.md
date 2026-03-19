# CHIKEN STOP SYSTEM

- Menu changes made only from Strapi CRM

- Api route on $url + /api/menu to get updated menu from strapi
- Strapi running on port 1337 so it is allowed in "remotePatterns" in next.config.ts


## Database:
Using Neon + Drizzle inside chikenstop-nextjs
- Table schema in /db/schema.ts
- To push schema in the neon table should run
```bash
npm run db:push
```
(this is in case there are changes in temporary_carts table)
- Environment variable: CART_TTL_MINUTES to indicate the time of the cart living in the database.
    - in times of a lot of usage may want to reduce it to a few minutes
- For persistence in the navigatos it's not using the DB but saves it in localStorage

# MercadoPago API
- it should be aware of my current URL, that's very important to get the confirmation of approved payments.

## Print Service
- `Next.js` only keeps `PRINT_SERVICE_TOKEN` in `chikenstop-nextjs/.env`.
- The Raspberry Pi worker now lives in `/print-service`.
- Setup:
```bash
cd /home/luka/Documents/chikenstop
./print-service/setup_conda_env.sh
```
- Run:
```bash
cd /home/luka/Documents/chikenstop
./print-service/run_worker.sh
```



# todo
- build categories for the admin panel
- create aditionals free/paid
- create promo codes
- create dashbord (dbt connected to neon from checkout_payments table) with:
    - hourly sales
    - daily sales
