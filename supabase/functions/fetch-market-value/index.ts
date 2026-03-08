const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TARGET_URL = "https://www.registrucentras.lt/masvert/paieska-obj";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unikalusNr } = await req.json();

    if (!unikalusNr) {
      return new Response(
        JSON.stringify({ vidutineRinkosVerte: "Nėra duomenų" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching market value for unikalusNr: ${unikalusNr}`);

    // Step 1: GET request to obtain CSRF token and session cookies
    const getResponse = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'lt,en;q=0.5',
      },
      redirect: 'follow',
    });

    const getHtml = await getResponse.text();

    // Extract cookies from Set-Cookie headers
    const setCookieHeaders = getResponse.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders
      .map((c: string) => c.split(';')[0])
      .join('; ');

    console.log(`Cookies extracted: ${cookies ? 'yes' : 'no'}`);

    // Extract CSRF token from HTML
    const csrfMatch = getHtml.match(/<input[^>]+name="_csrf"[^>]+value="([^"]+)"/i)
      || getHtml.match(/<input[^>]+value="([^"]+)"[^>]+name="_csrf"/i)
      || getHtml.match(/<meta[^>]+name="_csrf"[^>]+content="([^"]+)"/i);

    const csrfToken = csrfMatch?.[1];

    if (!csrfToken) {
      console.error('Could not extract CSRF token');
      console.log('HTML snippet (first 2000 chars):', getHtml.substring(0, 2000));
      return new Response(
        JSON.stringify({ vidutineRinkosVerte: "Nėra duomenų" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`CSRF token extracted: ${csrfToken.substring(0, 10)}...`);

    // Step 2: POST request with form data
    const formBody = new URLSearchParams({
      paieska: '0',
      unikalusNr: unikalusNr,
      stvGalioja: 'G',
      _csrf: csrfToken,
    });

    const postResponse = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'lt,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Referer': TARGET_URL,
      },
      body: formBody.toString(),
      redirect: 'follow',
    });

    const postHtml = await postResponse.text();
    console.log(`POST response status: ${postResponse.status}, length: ${postHtml.length}`);

    // Step 3: Parse the result — look for property value
    // Try multiple patterns for the value field
    let value: string | null = null;

    // Pattern: "Daikto vertė" or "Mokestinė vertė" followed by a number
    const patterns = [
      /Daikto\s+vert[eė]\s*:?\s*<[^>]*>\s*([\d\s,.]+)/i,
      /Mokestin[eė]\s+vert[eė]\s*:?\s*<[^>]*>\s*([\d\s,.]+)/i,
      /Daikto\s+vert[eė][^<]*<\/[^>]+>\s*<[^>]*>\s*([\d\s,.]+)/i,
      /Mokestin[eė]\s+vert[eė][^<]*<\/[^>]+>\s*<[^>]*>\s*([\d\s,.]+)/i,
      // Table cell patterns
      /Daikto\s+vert[eė].*?<td[^>]*>\s*([\d\s,.]+)\s*<\/td>/is,
      /Mokestin[eė]\s+vert[eė].*?<td[^>]*>\s*([\d\s,.]+)\s*<\/td>/is,
      // Generic: any number near "vertė"
      /vert[eė][^<]{0,50}?([\d][\d\s,.]{2,})/i,
    ];

    for (const pattern of patterns) {
      const match = postHtml.match(pattern);
      if (match?.[1]) {
        value = match[1].trim().replace(/\s+/g, ' ');
        console.log(`Value found with pattern: ${value}`);
        break;
      }
    }

    if (value) {
      // Clean up the value — remove trailing dots/commas, format nicely
      const cleanValue = value.replace(/[,.]$/, '').trim();
      // Format with spaces as thousands separator
      const numericStr = cleanValue.replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(numericStr);
      
      let formatted: string;
      if (!isNaN(num)) {
        formatted = Math.round(num).toLocaleString('lt-LT') + ' €';
      } else {
        formatted = cleanValue + ' €';
      }

      console.log(`Returning value: ${formatted}`);
      return new Response(
        JSON.stringify({ vidutineRinkosVerte: formatted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Debug: log a portion of the response to help diagnose
    console.log('Value not found. HTML snippet around "vert":', 
      postHtml.substring(
        Math.max(0, postHtml.toLowerCase().indexOf('vert') - 200),
        postHtml.toLowerCase().indexOf('vert') + 500
      ) || 'No "vert" found in response'
    );

    return new Response(
      JSON.stringify({ vidutineRinkosVerte: "Nėra duomenų" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching market value:', error);
    return new Response(
      JSON.stringify({ vidutineRinkosVerte: "Nėra duomenų" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
