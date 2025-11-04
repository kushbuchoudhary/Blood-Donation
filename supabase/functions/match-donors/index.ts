import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blood_group, city, urgency } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all available donors with the matching blood group
    let query = supabase
      .from("donors")
      .select("*")
      .eq("available", true);

    if (blood_group) {
      query = query.eq("blood_group", blood_group);
    }

    const { data: donors, error } = await query;

    if (error) throw error;

    // If no donors found, return empty array
    if (!donors || donors.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], insights: "No donors found matching the criteria" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to rank and match donors
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for a blood donation management system. Your task is to analyze donor data and provide intelligent matching and insights.
            
            When analyzing donors, consider:
            1. Location proximity (donors in the same city as the request should be prioritized)
            2. Recent donation history (donors who haven't donated recently are more likely to be eligible)
            3. Total donations (experienced donors may be more reliable)
            4. Urgency level of the request
            
            Return your response as a JSON object with:
            - "rankings": array of donor IDs in order of best match (include all donors)
            - "insights": a brief explanation of why these donors are good matches
            - "recommendations": any suggestions for the hospital or system administrators`,
          },
          {
            role: "user",
            content: `Analyze these donors for a blood request:
            
Blood Group Needed: ${blood_group}
City: ${city || "Not specified"}
Urgency: ${urgency || "medium"}

Available Donors:
${JSON.stringify(donors, null, 2)}

Provide your analysis and rankings.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", await aiResponse.text());
      // Fallback to simple sorting if AI fails
      const sortedDonors = donors.sort((a, b) => {
        // Prioritize same city
        if (city) {
          if (a.city.toLowerCase() === city.toLowerCase() && b.city.toLowerCase() !== city.toLowerCase()) return -1;
          if (b.city.toLowerCase() === city.toLowerCase() && a.city.toLowerCase() !== city.toLowerCase()) return 1;
        }
        // Then by total donations
        return b.total_donations - a.total_donations;
      });

      return new Response(
        JSON.stringify({
          matches: sortedDonors.slice(0, 10),
          insights: "Showing top donors based on location and experience (AI analysis unavailable)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "{}";

    // Try to parse AI response as JSON
    let aiAnalysis;
    try {
      // Extract JSON from the response (AI might wrap it in markdown)
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (e) {
      console.error("Error parsing AI response:", e);
      // Fallback to simple ranking
      aiAnalysis = {
        rankings: donors.map(d => d.id),
        insights: "AI provided textual analysis. Using default ranking.",
        recommendations: aiMessage.substring(0, 200),
      };
    }

    // Reorder donors based on AI rankings
    const rankedDonors = [];
    if (aiAnalysis.rankings && Array.isArray(aiAnalysis.rankings)) {
      for (const id of aiAnalysis.rankings) {
        const donor = donors.find(d => d.id === id);
        if (donor) rankedDonors.push(donor);
      }
    }

    // Add any donors not in the rankings
    for (const donor of donors) {
      if (!rankedDonors.find(d => d.id === donor.id)) {
        rankedDonors.push(donor);
      }
    }

    return new Response(
      JSON.stringify({
        matches: rankedDonors.slice(0, 10),
        insights: aiAnalysis.insights || "AI analysis complete",
        recommendations: aiAnalysis.recommendations || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in match-donors function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});