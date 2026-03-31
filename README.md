# Inklink

An open-source platform for crowdsourcing reader feedback on your writing. Clone the repo, deploy for free, and get a link you can send to beta readers.

Readers highlight passages and leave likes, dislikes, comments, and suggested edits. The author gets a dashboard with heatmaps, retention curves, and cross-version feedback tracking — all without readers seeing each other's responses.

## Features

- **Inline feedback** — readers highlight text and react, comment, or suggest edits
- **Timeline scrubbing** - scrub through every version of your writing to track its evolution
- **Feedback heatmap** — see which passages get the most engagement
- **Version-aware** — feedback stays anchored to the version it was given on, with cross-version mapping so you can track how feedback changed as your work did.
- **Retention tracking** — see where readers stop, how long they spend, and completion rates
- **Email capture** — readers can leave their email if they want to recieve updates on your work
- **Private by default** — readers can't see each other's feedback
- **Unique reader links** — invite readers individually or by group, track who gave what
- **Git-backed** — chapter history comes from your repo's commit log

## Deploy

Click the button to deploy your own instance. You'll need a [Neon](https://neon.tech) Postgres database (free tier works).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdivyavenn%2Finklink&env=TITLE,AUTHOR_DASH_PASSWORD&envDescription=Book%20title%20(required)%20and%20dashboard%20password%20(optional)&envLink=https%3A%2F%2Fgithub.com%2Fdivyavenn%2Finklink%23environment-variables&project-name=inklink&repository-name=inklink&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

Use these settings when configuring the Neon integration:

<p>
  <img src="public/setup1.png" width="400" alt="Neon setup step 1" />
  <img src="public/setup2.png" width="400" alt="Neon setup step 2" />
</p>

The Neon integration will provision a database and set `DATABASE_URL` automatically. The schema bootstraps itself on first deploy.

### Customizing your landing page

Edit `info.json` in the repo root to set the title and blurb shown on your landing page:

```json
{
  "title": "My Novel",
  "blurb": "A short description readers see when they land on your site."
}
```

This file is preserved when syncing upstream updates (see below), so your landing page stays yours.


## Adding Content

Add each section of your work as a markdown file in the `chapters/` folder. Indicate the title and relative order at the top using this format.

```markdown
---
title: "Chapter 1: The Beginning"
order: 1
---

Your chapter content here.
```

Work directly on markdown files, push your changes to your repo, and Inklink will ingest the new commit automatically. Readers will see the most recent version on the read link.

## Staying up to date

Your deployed repo includes a GitHub Action (`.github/workflows/sync-upstream.yml`) that checks for upstream updates every Monday. By default it does a **hard pull**: it replaces everything in your repo with the latest upstream code, then restores only your `chapters/`, `.github/workflows/`, and `info.json`. This means you get a clean update with no merge conflicts, but any other local changes outside those paths will be overwritten.

To pull updates manually at any time, go to **Actions > Sync upstream > Run workflow** in your repo.

If you've customized code beyond chapters and `info.json`, you can replace the default workflow with one that opens a merge PR instead — giving you a chance to review and resolve conflicts before anything lands on main.


### Environment variables

| Variable | Required | Set by | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | Auto (Neon integration) | Neon Postgres connection string |
| `TITLE` | Yes | Quick Deploy prompt | Your book's title — the URL slug is derived from this automatically |
| `AUTHOR_DASH_PASSWORD` | No | Quick Deploy prompt | Password-protect the author dashboard |
| `NEXT_PUBLIC_BASE_URL` | No | Manual | Your deploy URL, used for generating invite links |

## Local development

```bash
git clone https://github.com/divyavenn/inklink.git
cd inklink
npm install
cp .env.example .env.local   # fill in DATABASE_URL and book config
npm run dev
```

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Styled Components
- Framer Motion
- Neon Postgres (serverless driver)
- simple-git for version history

## License

MIT
