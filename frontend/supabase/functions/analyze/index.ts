import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model configurations with their strengths
const MODELS = {
  'complex': 'google/gemini-2.5-pro',
  'balanced': 'google/gemini-2.5-flash',
  'fast': 'google/gemini-2.5-flash',
  'lite': 'google/gemini-2.5-flash-lite',
} as const;

type ModelType = keyof typeof MODELS;

interface AnalysisRequest {
  query: string;
  data?: Record<string, unknown>[];
  columns?: string[];
  context?: string;
  modelOverride?: ModelType;
  streaming?: boolean;
}

interface AnalysisResult {
  reasoning: string[];
  insights: Array<{
    type: 'observation' | 'trend' | 'anomaly' | 'recommendation';
    title: string;
    description: string;
    confidence: number;
  }>;
  visualizations: Array<{
    type: string;
    title: string;
    reason: string;
    config?: Record<string, unknown>;
  }>;
  followUpQuestions: string[];
  summary: string;
}

// Analyze query complexity to select optimal model
function analyzeQueryComplexity(query: string, dataSize: number): ModelType {
  const complexIndicators = [
    'correlation', 'regression', 'predict', 'forecast', 'trend analysis',
    'statistical', 'hypothesis', 'causal', 'multi-variable', 'time series',
    'anomaly detection', 'clustering', 'segmentation', 'compare across'
  ];
  
  const moderateIndicators = [
    'summarize', 'average', 'total', 'distribution', 'top', 'bottom',
    'group by', 'filter', 'sort', 'compare', 'percentage'
  ];
  
  const queryLower = query.toLowerCase();
  const complexScore = complexIndicators.filter(i => queryLower.includes(i)).length;
  const moderateScore = moderateIndicators.filter(i => queryLower.includes(i)).length;
  
  // Factor in data size
  const isLargeDataset = dataSize > 1000;
  const isMediumDataset = dataSize > 100;
  
  if (complexScore >= 2 || (complexScore >= 1 && isLargeDataset)) {
    return 'complex';
  } else if (moderateScore >= 2 || (moderateScore >= 1 && isMediumDataset)) {
    return 'balanced';
  } else if (query.length < 50 && !isMediumDataset) {
    return 'lite';
  }
  
  return 'fast';
}

// Build chain-of-thought system prompt
function buildSystemPrompt(context?: string): string {
  return `You are SpaceForge AI, an expert data analyst with deep expertise in statistics, business intelligence, and data visualization.

## Your Cognitive Architecture

You employ a rigorous analytical framework:
1. **Observation**: First, examine the data carefully
2. **Pattern Recognition**: Identify trends, clusters, and anomalies
3. **Hypothesis Formation**: Develop theories about what the data reveals
4. **Validation**: Cross-check findings against statistical principles
5. **Synthesis**: Combine insights into actionable intelligence

## Analysis Protocol

When analyzing data, ALWAYS:
1. **Show Your Reasoning**: Think step-by-step, explaining each analytical decision
2. **Quantify Findings**: Use specific numbers, percentages, and statistical measures
3. **Prioritize Insights**: Rank findings by business impact and statistical significance
4. **Suggest Visualizations**: Recommend the best chart types to communicate findings
5. **Generate Follow-ups**: Propose deeper questions the data could answer

## Response Format

You MUST respond with valid JSON matching this structure:
{
  "reasoning": ["step 1 of your analysis...", "step 2...", "step 3..."],
  "insights": [
    {
      "type": "observation|trend|anomaly|recommendation",
      "title": "Brief insight title",
      "description": "Detailed explanation with specific data points",
      "confidence": 0.0-1.0
    }
  ],
  "visualizations": [
    {
      "type": "bar|line|pie|scatter|heatmap|area",
      "title": "Chart title",
      "reason": "Why this visualization works for this data"
    }
  ],
  "followUpQuestions": ["Question 1?", "Question 2?", "Question 3?"],
  "summary": "Executive summary in 2-3 sentences"
}

${context ? `## Additional Context\n${context}` : ''}

Remember: Quality over speed. Take time to reason through the data thoroughly.`;
}

// Generate data context for the AI
function generateDataContext(data: Record<string, unknown>[], columns: string[]): string {
  if (!data || data.length === 0) return 'No data provided.';
  
  const sampleSize = Math.min(data.length, 20);
  const sample = data.slice(0, sampleSize);
  
  // Calculate basic statistics for numeric columns
  const stats: Record<string, { min: number; max: number; avg: number; nullCount: number }> = {};
  
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
    const numericValues = values.filter(v => !isNaN(Number(v))).map(Number);
    
    if (numericValues.length > values.length * 0.7) {
      stats[col] = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        nullCount: data.length - values.length
      };
    }
  });
  
  return `
## Dataset Overview
- Total rows: ${data.length}
- Columns: ${columns.join(', ')}

## Column Statistics
${Object.entries(stats).map(([col, s]) => 
  `- ${col}: min=${s.min.toFixed(2)}, max=${s.max.toFixed(2)}, avg=${s.avg.toFixed(2)}, nulls=${s.nullCount}`
).join('\n')}

## Sample Data (first ${sampleSize} rows)
${JSON.stringify(sample, null, 2)}
`;
}

// Call Lovable AI Gateway
async function callAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  streaming: boolean
): Promise<Response | AnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: streaming,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('API credits exhausted. Please add credits to continue.');
    }
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  if (streaming) {
    return response;
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from AI');
  }

  // Parse JSON response
  try {
    // Extract JSON from potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    return JSON.parse(jsonStr) as AnalysisResult;
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    // Return a structured fallback
    return {
      reasoning: ['Analysis completed but response parsing failed'],
      insights: [{
        type: 'observation',
        title: 'Raw Analysis',
        description: content.substring(0, 500),
        confidence: 0.5
      }],
      visualizations: [],
      followUpQuestions: [],
      summary: 'Analysis completed. See raw response for details.'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AnalysisRequest = await req.json();
    const { query, data = [], columns = [], context, modelOverride, streaming = false } = body;

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Analyze] Query: "${query.substring(0, 100)}..." | Data rows: ${data.length}`);

    // Select model based on complexity or override
    const modelType = modelOverride || analyzeQueryComplexity(query, data.length);
    const selectedModel = MODELS[modelType];
    
    console.log(`[Analyze] Selected model: ${selectedModel} (type: ${modelType})`);

    // Build prompts
    const systemPrompt = buildSystemPrompt(context);
    const dataContext = generateDataContext(data, columns);
    const userPrompt = `${dataContext}\n\n## User Query\n${query}\n\nAnalyze this data and respond with the JSON structure specified in your instructions.`;

    // Call AI
    if (streaming) {
      const streamResponse = await callAI(selectedModel, systemPrompt, userPrompt, true) as Response;
      return new Response(streamResponse.body, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    const result = await callAI(selectedModel, systemPrompt, userPrompt, false) as AnalysisResult;
    
    return new Response(
      JSON.stringify({
        success: true,
        model: selectedModel,
        modelType,
        result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Analyze] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const status = message.includes('Rate limit') ? 429 : 
                   message.includes('credits') ? 402 : 500;
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
