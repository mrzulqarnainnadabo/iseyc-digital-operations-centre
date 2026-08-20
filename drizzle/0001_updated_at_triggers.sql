-- Postgres has no equivalent to MySQL's `.onUpdateNow()` column modifier, so
-- every table that relies on "updatedAt" auto-refreshing on every UPDATE gets
-- an equivalent trigger here. This preserves prior behavior exactly without
-- needing to touch every service-layer UPDATE call site individually.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "meeting_submissions_set_updated_at" BEFORE UPDATE ON "meeting_submissions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "meeting_action_items_set_updated_at" BEFORE UPDATE ON "meeting_action_items" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "meeting_automation_settings_set_updated_at" BEFORE UPDATE ON "meeting_automation_settings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "institutional_prompts_set_updated_at" BEFORE UPDATE ON "institutional_prompts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "command_brief_runs_set_updated_at" BEFORE UPDATE ON "command_brief_runs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "content_drafts_set_updated_at" BEFORE UPDATE ON "content_drafts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "developmental_profiles_set_updated_at" BEFORE UPDATE ON "developmental_profiles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "community_tiers_set_updated_at" BEFORE UPDATE ON "community_tiers" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "responsibility_pillars_set_updated_at" BEFORE UPDATE ON "responsibility_pillars" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "community_units_set_updated_at" BEFORE UPDATE ON "community_units" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "member_community_affiliations_set_updated_at" BEFORE UPDATE ON "member_community_affiliations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "member_pillar_focuses_set_updated_at" BEFORE UPDATE ON "member_pillar_focuses" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "mentorship_relationships_set_updated_at" BEFORE UPDATE ON "mentorship_relationships" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "development_growth_plans_set_updated_at" BEFORE UPDATE ON "development_growth_plans" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "chamber_sessions_set_updated_at" BEFORE UPDATE ON "chamber_sessions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "chamber_participants_set_updated_at" BEFORE UPDATE ON "chamber_participants" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "chamber_document_intelligence_drafts_set_updated_at" BEFORE UPDATE ON "chamber_document_intelligence_drafts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
