# Maju Terus Aircond Service — Management Website

A static scheduling and customer management website for Maju Terus Aircond
Service. No build step, no server — plain HTML/CSS/JS that runs entirely in
the browser and can be hosted for free with GitHub Pages.

## Features

- **Customers** (`customers.html`): add/edit/delete customers (name,
  telephone number, address).
- **Schedule** (`schedule.html`): a weekly job board. Add a job for a
  customer with part cost, labor cost, discount, subtotal, and total
  automatically calculated. Drag a job card to another day, or reorder
  within a day, to rearrange the schedule — changes save automatically.
- **Assignment**: each job is assigned to In House, Sub Marvel, or Sub
  Peter. Every day column has a "Share" chip per assignee (showing their
  job count for that day) that generates a PDF of just their jobs for the
  day (customer, phone, address, time, notes — no pricing) and shares it
  via the phone's native share sheet where available, or downloads it
  otherwise.
- **Day View** (`day.html`): a bigger, clearer look at a single day, split
  into one panel per assignee (In House / Sub Marvel / Sub Peter) side by
  side — useful when a day has many jobs across different people and the
  compact weekly columns get crowded. Jump to it from any day's "View
  day →" link on the Schedule page.

## Data storage

All data (customers and jobs) is stored in the browser's `localStorage`.
There is no shared backend, so data does **not** sync between devices or
browsers — each device keeps its own local copy.

## Running locally

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080.

## Deploying with GitHub Pages

1. In the repo, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to "Deploy from a branch".
3. Choose the `main` branch and `/ (root)` folder, then **Save**.
4. GitHub will publish the site at
   `https://<your-username>.github.io/majuterus/` within a minute or two.
