# Inklink
When I wrote the first chapter of my novel, I offhandendly tweeted if anyone would like to read it and give me feedback.

On September 28, 2004, Neil Gaiman [wrote](https://journal.neilgaiman.com/2004_09_01_archive.html) in his journal: "Remember: when people tell you something's wrong or doesn't work, they are almost always right. When they tell you exactly what's wrong and how to fix it, they are almost always wrong." 

That idea is the center of Inklink. Inklink lets you create your own platform for crowdsourcing reader feeedback just by cloning a Git repo. 

The point is to help the writer collect signal from their target audience with all the precision of consumer research. Readers are usually pretty good at telling you what a piece of writing did to them. They can tell you where they got bored, where they got confused, where something landed, and where they wanted more.

The job of the writer is to figure out 1) if their writing is creating the effect they want 2) how to fix it if it isn't.

There is also a market angle here. Publishing is full of gatekeeping, tastemaking, and a lot of soft nepotism. If you can show that real readers engaged with the work, reacted to specific passages, finished chapters, and gave you their email because they want the finished book, you are walking into this lion's den with much-needed leverage.

You just clone the repo, deploy for free using Vercel and [Neon](https://neon.com/), and get a link you can send your friends or post on forums or socials. 

## What I built

- private reading links for draft chapters
- inline reactions, comments, and suggested edits at the passage level
- Git-backed chapter history so feedback stays attached to actual versions
- cross-version feedback mapping so old signal can survive into new drafts
- retention and reach tracking so the author can see where readers stop
- email capture from interested readers so audience demand is not lost in random DMs and docs


## Why not just Google Docs?

Google Docs has a few problems.

1) Everyone can see everyone else's comments, which biases feedback
2) Sharing permissions is annoying
3) feedback is not version-aware. You can't compare how feedback changed as your work evolved. you also can't edit your work with losing old feedback. 
4) no primitive reactions. You can leave comments and suggest edits, but there's easy shortcut to a reader indicating they liked or didn't like a line. This means there's no way to get a heatmap of where your piece works and where it doesn't. Inlink lets you do this. 
5) the interface is not easy on the eyes


## version control 

One of the product goals was effortless version control. Inklink treats the repo as the source of truth and ingests chapter history from Git into `document_versions` and `chapter_versions`.

Under the hood I use `simple-git` from the repo root, cache Git logs for 10 seconds, keep up to 100 Git log entries and 500 file-content entries in memory, and store commit metadata alongside rendered chapter state. 

## reader sessions 

The phrase "consumer research" sounds very clinical for the deeply personal and transformative act of writing, but if you want to get better at any creative act an eagle's eye view on your work is very useful. It's imporant to know which scenes get strong reactions, what lines they skim over, where readers drop off, and what confuses or excites them. 

Every time a user opens your link, Inlink upserts a `chapter_reads` record per reader session and chapter version, and tracks things like max line seen, active seconds, completion percent, and completion state. It removes all the friction of making an account. 

## Email capture as leverage

One of the more important parts of Inklink is that it does not stop at critique.

Readers can leave an email if they want to hear about the finished book. Those signups are stored against the work, and where possible also linked to the reader session, invite, group, and chapter version that generated them. It is intentionally simple. I was not trying to build a CRM.

The point is that writers should be able to own their reader relationships directly. If the publishing industry remains weirdly closed, relationship-driven, and unevenly accessible, then audience ownership matters. A small but real list of readers who already engaged with the work is useful in two ways:

- it helps the writer keep testing and refining the manuscript
- it gives the writer leverage when pitching to publishers. instead of trying to convince them your book is a good investment, you have cold hard proof
- if you want to self publish, you have an email list of the people most likely to buy your book


## How to use

If you want to run it locally:

```bash
git clone https://github.com/divyavenn/inklink.git
cd inklink
npm install
npm run dev
```

Then add your markdown files (one for each section) in the chapters folder. Indicate the title and relative order of each section at the top using this format.

```
---
title: "chapter I"
order: 1
---
```

The environment variables you need are in .env.example. 


Create a Neon account and set the environment variable `DATABASE_URL`. Then simply create a Vercel account, point it to your repo, and deploy. You can use the same Neon account for multiple repos as long as the `BOOK_SLUG` variable is distinct`