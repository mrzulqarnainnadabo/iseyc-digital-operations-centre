# Notion secondary engine

## Goal
Reduce Supabase storage and load by archiving **summaries** to Notion.

| Store | Role |
|-------|------|
| **Supabase / Postgres** | Live operational state only |
| **Notion** | Secondary archive for development journey snapshots and ops summaries |

## Notion database
- Title: **DOC Secondary Archive — Development Journey**
- Parent: ISEYC Digital Operations Centre
- Database id: `eb01c8e79b0d4039b4c8312daa5ed892`
- Data source: `collection://aa1f27eb-19f1-4ff2-908a-ad744bdeeb8b`

## App env (Vercel)
```
NOTION_TOKEN=<internal integration secret>
NOTION_JOURNEY_DATABASE_ID=eb01c8e79b0d4039b4c8312daa5ed892
```

Share the Notion database with the integration.

## API
- `development.archiveJourneyToNotion` — member archives own journey snapshot
- `development.notionSecondaryStatus` — whether Notion is configured

## Efficiency defaults
- React Query `staleTime` 45s, no refetch on focus
- Attention scan bounds reduced (80 submissions / 150 actions / 25 briefs)
- `/api/health` stays lightweight (no full attention scan)
