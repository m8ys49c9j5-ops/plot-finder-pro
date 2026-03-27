import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://zemepro.lt";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Netinkamas užklausos formatas (turi būti JSON).');
    }

    const { email, message, website } = body;

    // Honeypot check
    if (website) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!email || !message) {
      throw new Error('El. paštas ir žinutė yra privalomi.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
      return new Response(JSON.stringify({ error: "Neteisingas el. pašto formatas." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (message.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Žinutė per trumpa. Mažiausiai 30 simbolių." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limiting
    const { data: recent } = await sb.from("contact_submissions").select("id").eq("email", email)
      .gte("submitted_at", new Date(Date.now() - 30000).toISOString()).limit(1);

    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ error: "Viršytas žinučių limitas. Palaukite prieš siunčiant dar kartą." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429,
      });
    }

    if (!RESEND_API_KEY) {
      console.error("CRITICAL: RESEND_API_KEY is missing.");
      await sb.from("contact_messages").insert({ email, message: message.trim() });
      await sb.from("contact_submissions").insert({ email });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const escapedEmail = escapeHtml(email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'ZemePro Kontaktinė Forma <onboarding@resend.dev>',
        to: 'zemeprolt@gmail.com',
        reply_to: email,
        subject: `Nauja žinutė nuo: ${escapedEmail}`,
        html: `<div><h2>Nauja užklausa iš ZemePro.lt</h2><p><strong>El. paštas:</strong> ${escapedEmail}</p><p><strong>Žinutė:</strong></p><blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:8px 0">${escapedMessage}</blockquote></div>`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || 'Klaida siunčiant laišką.');
    }

    await sb.from("contact_submissions").insert({ email });
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
