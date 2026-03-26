const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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

    const { email, message } = body;

    if (!email || !message) {
      throw new Error('El. paštas ir žinutė yra privalomi.');
    }

    if (!RESEND_API_KEY) {
      console.error("CRITICAL: RESEND_API_KEY is missing in Supabase Edge Function secrets.");
      throw new Error('Serverio konfigūracijos klaida. Susisiekite su administratoriumi.');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'ZemePro Kontaktinė Forma <onboarding@resend.dev>',
        to: 'zemeprolt@gmail.com',
        reply_to: email,
        subject: `Nauja žinutė nuo: ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1a1a1a;">Nauja užklausa iš ZemePro.lt</h2>
            <p><strong>Vartotojo el. paštas:</strong> ${email}</p>
            <p><strong>Žinutė:</strong></p>
            <div style="background:#f5f5f5;padding:15px;border-radius:8px;white-space:pre-wrap;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        `
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || 'Klaida siunčiant laišką per Resend serverius.');
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
