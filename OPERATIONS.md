# ISEYC Digital Operations Centre — Operational Controls

## Meeting & Decision Tracker fallback processing

The Meeting & Decision Tracker uses a **project-level Heartbeat** as a fallback for live submissions that remain eligible after the 12-minute consolidation window. The primary operating model remains event-driven intake; the scheduled fallback does not approve records, assign actions, close actions, distribute communications, or process isolated test material.

| Control | Registered configuration |
| --- | --- |
| Registered task | `ise yc-meeting-fallback` (stored as `iseyc-meeting-fallback`) |
| Durable task UID | `JnmexNWXdCbDby3jPgyrUV` |
| Cadence | Every 15 minutes, expressed as `0 */15 * * * *` in UTC |
| Callback path | `/api/scheduled/meeting-fallback` |
| Durable configuration | `meeting_automation_settings` row `meeting-tracker` |
| Safety binding | The endpoint accepts a cron call only when its authenticated task UID matches the persisted task UID and the fallback is enabled. |

### Activation and verification record

The project-level task existed under the project-owner schedule identity. It was registered in `meeting_automation_settings` with `fallbackEnabled = true` and the task UID above. For controlled verification, its cadence was temporarily accelerated, then restored immediately to the 15-minute schedule.

> The post-binding production run completed successfully at **2026-08-15T23:08:10Z** with HTTP **200** and the response `{"ok":true,"processed":0,"outcomes":[]}`. No live submissions were processed in that verification run.

### Management rules

Only an authorised ISEYC administrator may change fallback settings in the application. Project owners may inspect the task through the platform schedule controls or the project-level heartbeat command interface. Any change to the fallback endpoint, callback path, or task-identity logic requires a new tested deployment before the schedule is modified. The task must remain at the registered 15-minute cadence unless a time-limited, documented verification is required.

### Safety boundary

The fallback processes only live submissions in `pending_consolidation` whose consolidation deadline has elapsed. It does not access `isTestMode = true` records. AI output remains a draft, and every record, decision, or action requires the existing human-review and human-approval gates.
