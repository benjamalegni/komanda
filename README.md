# KOMANDA SYSTEM

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
- Setup (in Raspberry PI system):

```bash
./print-service/setup_conda_env.sh
```

- Run:

```bash
./print-service/run_worker.sh
```

# Data modelling

As per now, Sprapi v5 does not support polymorphic relations, so the way to model the entities was repetitve and dull at best, but it is what it is. The entities are:

- MenuItem:
  - name
  - price
  - description
  - image
  - category (relation to Category, many to one)
  - combos (relation to Combo, many to many)
  - active (optional), not used for now. The same for combos
- Combo:
  - name
  - price (The total price of the combo, not the sum of the items)
    - note: the discount will be given by discount = sumItemsPrice - combo.price
  - description
  - image
  - items (relation to MenuItem, many to many)
- Category:
  - name
  - menuItems (relation to MenuItem, one to many)
  - combos (relation to Combos, one to many)

---

# VPS Configuration
[!NOTE] This system was tested used with dokploy. For now, migrations and configurations will be centered around this tool.

### Migrating Dokploy to a different VPS
Transfer the entire filesystem using rsync:
```bash
rsync -aAXv --delete \ --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found","/swapfile"} \ -e "ssh -i /path/to/private_key" user@source_vps_ip:/ / 
```
After the migration, update the server IP in the Dokploy database:
```sql
UPDATE admin SET "serverIp" = 'new_server_ip' WHERE "serverIp" = 'old_server_ip'; 
```
[!IMPORTANT]
Environment variables should be saved in advance for each service running inside dokploy. 

# todo

- build categories for the admin panel
- create aditionals free/paid
- create promo codes
- create dashbord (dbt connected to neon from checkout_payments table) with:
  - hourly sales
  - daily sales

