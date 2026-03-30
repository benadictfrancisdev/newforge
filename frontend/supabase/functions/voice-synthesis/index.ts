import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'curious' | 'confused';
  confidence: number;
  tone: 'formal' | 'casual' | 'excited' | 'concerned';
  adaptedResponse?: string;
}

interface UserContext {
  messageCount: number;
  preferredStyle: 'beginner' | 'intermediate' | 'expert';
  commonTopics: string[];
  interactionPatterns: {
    averageMessageLength: number;
    questionsAsked: number;
    visualizationsRequested: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { action, text, message, userContext, conversationHistory, dataContext } = body;

    console.log(`[VoiceSynthesis] Action: ${action}, User: ${user.id}`);

    if (action === 'analyze-sentiment') {
      // Analyze sentiment of user message
      const sentimentPrompt = `Analyze the sentiment and emotional state of this user message in a data analytics context.

User Message: "${message}"

Previous messages context: ${conversationHistory?.slice(-3).map((m: any) => m.content).join(' | ') || 'None'}

Return a JSON object with:
- "sentiment": one of "positive", "negative", "neutral", "frustrated", "curious", "confused"
- "confidence": number 0-100
- "tone": one of "formal", "casual", "excited", "concerned"
- "emotionalCues": array of detected emotional indicators
- "suggestedResponseTone": how the AI should respond
- "needsClarification": boolean if the user seems confused
- "frustrationLevel": number 0-10`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: sentimentPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`Sentiment analysis failed: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'adapt-response') {
      // Adapt AI response based on user's expertise level and sentiment
      const { originalResponse, sentiment, userLevel } = body;

      const adaptPrompt = `Adapt this AI response based on the user's context:

Original Response: "${originalResponse}"

User's Expertise Level: ${userLevel || 'intermediate'}
User's Current Sentiment: ${sentiment?.sentiment || 'neutral'}
User's Tone Preference: ${sentiment?.tone || 'casual'}
Frustration Level: ${sentiment?.frustrationLevel || 0}/10

Adaptation Rules:
- For beginners: Use simpler language, explain technical terms, add examples
- For experts: Be concise, use technical terminology, skip basics
- For frustrated users: Be extra helpful, acknowledge difficulty, offer alternatives
- For confused users: Break down into steps, ask clarifying questions
- For curious users: Provide more depth and related insights

Return JSON with:
- "adaptedResponse": the adapted response text
- "addedExplanations": array of terms/concepts explained
- "toneAdjustment": description of how tone was adjusted
- "followUpSuggestions": array of helpful follow-up questions`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: adaptPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`Response adaptation failed: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate-suggestions') {
      // Generate intelligent query suggestions based on context
      const suggestionPrompt = `Generate intelligent query suggestions for a data analytics chatbot.

Current Dataset Context: ${dataContext || 'General data analysis'}
User's Recent Questions: ${conversationHistory?.slice(-5).filter((m: any) => m.role === 'user').map((m: any) => m.content).join('; ') || 'None'}
User's Expertise Level: ${userContext?.preferredStyle || 'intermediate'}
Current Partial Input: "${text || ''}"

Generate suggestions that:
1. Complete partial queries intelligently
2. Suggest relevant follow-up analyses
3. Recommend visualization types based on data
4. Offer "did you mean" corrections for typos
5. Suggest deeper dives into interesting patterns

Return JSON with:
- "autoComplete": array of 3 completions for partial input
- "didYouMean": correction if typo detected, null otherwise
- "followUpQuestions": array of 4 relevant follow-up questions
- "visualizationSuggestions": array of { "type": chart type, "reason": why this chart }
- "deepDiveTopics": array of topics worth exploring further
- "quickActions": array of { "label": button text, "query": full query to execute }`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: suggestionPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`Suggestion generation failed: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'recommend-chart') {
      // AI-powered chart recommendation
      const chartPrompt = `You are an expert data visualization consultant with >99% accuracy.

Dataset Information:
- Name: ${body.datasetName || 'Unknown'}
- Columns: ${body.columns?.join(', ') || 'Not specified'}
- Column Types: ${JSON.stringify(body.columnTypes) || 'Not specified'}
- Sample Data: ${JSON.stringify(body.sampleData?.slice(0, 5)) || 'Not provided'}
- Row Count: ${body.rowCount || 'Unknown'}

User's Analysis Goal: "${body.analysisGoal || 'General visualization'}"

Recommend the BEST visualization type with specific reasoning.

Return JSON with:
- "recommendedChart": { "type": "bar"|"line"|"pie"|"area"|"scatter"|"heatmap"|"treemap"|"funnel", "confidence": 0-100 }
- "configuration": { "xAxis": column, "yAxis": column, "groupBy": column or null, "colorBy": column or null }
- "reasoning": why this chart is best for this data
- "alternatives": array of { "type": chart type, "useCase": when to use this instead }
- "dataPreparation": any transformations needed
- "insightsToHighlight": what patterns this chart will reveal
- "interactivitySuggestions": array of interactive features to add`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: chartPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`Chart recommendation failed: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'synthesize-speech') {
      // For now, return a marker that speech should be synthesized client-side
      // This could be extended to use a TTS API
      return new Response(JSON.stringify({
        text: text,
        shouldSpeak: true,
        voiceSettings: {
          rate: 1.0,
          pitch: 1.0,
          voice: 'default'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Invalid action: ${action}`);

  } catch (error) {
    console.error('[VoiceSynthesis] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});