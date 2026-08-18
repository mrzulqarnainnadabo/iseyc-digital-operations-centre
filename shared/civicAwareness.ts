export const civicAwarenessModel = {
  civicBrainUrl: "https://iseyc-civic-brain.vercel.app/",
  connectionName: "Civic Brain reference connection",
  connectionDescription: "The Civic Brain is a linked strategic intelligence environment. The DOC does not automatically import, verify, republish, or act on its material. Any item brought into DOC requires a named source, an accountable reviewer, and a human decision on the appropriate next step.",
  awarenessLevels: [
    { title: "National Assembly", purpose: "Identify source-traceable legislative developments that may require neutral civic explanation." },
    { title: "Federal", purpose: "Record reviewed federal public developments relevant to community understanding and responsible institutional planning." },
    { title: "State", purpose: "Connect verified state-level developments to local context without partisan interpretation or political endorsement." },
    { title: "Local", purpose: "Ground reviewed developments in community signals from the approved grassroots structure and Responsibility Pillars." },
  ],
  controlledFlow: ["Source capture", "Accountable review", "Plain-language draft", "Human approval", "Public education release"],
  safeguards: [
    "No autonomous source collection, verification, record approval, escalation, action assignment, or publication.",
    "Every proposed awareness item must retain a source reference, date, geographic level, reviewer, and review status.",
    "The national awareness layer must remain non-partisan, systems-focused, and unsuitable for political endorsement, campaigning, or personality-driven messaging.",
    "Public education material is draft-only until an accountable human approves it through the relevant ISEYC governance route.",
  ],
} as const;
