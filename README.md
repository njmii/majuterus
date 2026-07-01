# Maju Terus Aircond Service — Management Website

A scheduling and customer management app for Maju Terus Aircond Service.

## Features

- **Customers**: add/edit/delete customers (name, telephone number, address).
- **Schedule**: a weekly job board. Add a job for a customer with part cost,
  labor cost, discount, subtotal, and total automatically calculated. Drag a
  job card to another day, or reorder within a day, to rearrange the
  schedule — changes save automatically.

## Getting started

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:3000. Data is stored locally in `app/data/app.db`
(SQLite, via Node's built-in `node:sqlite`).
