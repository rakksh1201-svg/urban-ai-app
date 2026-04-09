import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method === "POST") {
      const body = await req.json();
      
      // Validate required fields
      const { user_id, device_id, temperature, humidity, room_name, air_quality_index } = body;
      
      if (!user_id || temperature === undefined || humidity === undefined) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: user_id, temperature, humidity" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof temperature !== "number" || typeof humidity !== "number") {
        return new Response(
          JSON.stringify({ error: "temperature and humidity must be numbers" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate comfort score
      const tempScore = temperature >= 22 && temperature <= 26 ? 100 : Math.max(0, 100 - Math.abs(temperature - 24) * 8);
      const humScore = humidity >= 40 && humidity <= 60 ? 100 : Math.max(0, 100 - Math.abs(humidity - 50) * 2.5);
      const comfort_score = Math.round(tempScore * 0.65 + humScore * 0.35);

      // Generate recommendation
      const tips: string[] = [];
      if (temperature > 30) tips.push("Room is very hot — turn on AC or fan");
      else if (temperature > 28) tips.push("Room is warm — consider cooling");
      else if (temperature < 18) tips.push("Room is cold — close windows");
      if (humidity > 70) tips.push("High humidity — use dehumidifier");
      else if (humidity < 30) tips.push("Air is very dry — use humidifier");
      if (tips.length === 0) tips.push("Conditions are comfortable");

      const { data, error } = await supabase.from("room_climate").insert({
        user_id,
        device_id: device_id || null,
        room_name: room_name || "Living Room",
        temperature,
        humidity,
        comfort_score,
        air_quality_index: air_quality_index || null,
        recommendation: tips.join(". "),
        source: "iot",
      }).select().single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, reading: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
