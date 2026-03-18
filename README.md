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