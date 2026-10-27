import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai-run-id.server";

/** Writes Hebrew league news articles from a facts summary. Returns parsed JSON items. */
export async function writeNews(facts: string): Promise<{ title: string; body: string }[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("חסר מפתח AI");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions:
      "אתה כתב ספורט נלהב של ליגת FIFA אחד על אחד בין חברים. כתוב בעברית בלבד, בסגנון כותרות ספורט אנרגטי וקליל. " +
      "כתוב 3 ידיעות קצרות (2-4 משפטים כל אחת) על הדברים המעניינים ביותר: תוצאות מפתיעות, שחקנים בולטים, שחקנים שלא פתחו בהרכב, קפטנים, מצב הטבלה. " +
      "השתמש רק בעובדות שניתנו. החזר JSON בלבד בפורמט: {\"items\":[{\"title\":\"...\",\"body\":\"...\"}]}",
    messages: [{ role: "user", content: `נתוני json של הליגה:\n${facts}` }],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("ה-AI לא החזיר ידיעות");
  const parsed = JSON.parse(match[0]) as { items?: { title: string; body: string }[] };
  return (parsed.items ?? []).filter((i) => i.title && i.body).slice(0, 5);
}
