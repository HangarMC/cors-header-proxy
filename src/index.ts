export type Env = {
  [key in `SERVER_${string}_URL`]: string;
};

export default {
  async fetch(request, env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    async function handleRequest(request: Request) {
      const url = new URL(request.url);
      const origin = request.headers.get("Origin");

      // If the request has an Origin header, add CORS headers to the response
      if (!origin) {
        return new Response("These are not the droids you are looking for!", { status: 400 });
      }

      const key = url.pathname.split("/")?.[1];

      if (!key) {
        return new Response("These are not the droids you are looking for", { status: 400 });
      }

      const apiUrlString = env[`SERVER_${key.toUpperCase()}_URL`];
      if (!apiUrlString) {
        return new Response("These are (still) not the droids you are looking for", { status: 400 });
      }

      const proxiedUrl = new URL(apiUrlString);

      // Rewrite request to point to proxy url.
      proxiedUrl.pathname = proxiedUrl.pathname + url.pathname.replace("/" + key, "");
      proxiedUrl.search = url.search;
      request = new Request(proxiedUrl.toString(), request);
      // cleanup the headers, add our origin header
      request.headers.delete("Host");
      request.headers.delete("Cookie");
      request.headers.delete("Referrer");
      request.headers.set("Origin", proxiedUrl.origin);
      let response = await fetch(request);

      // Recreate the response so you can modify the headers
      response = new Response(response.body, response);

      // Set CORS headers
      response.headers.set("Access-Control-Allow-Origin", origin);
      // Append to/Add Vary header so browser will cache response correctly
      response.headers.append("Vary", "Origin");

      return response;
    }

    async function handleOptions(request: Request) {
      if (request.headers.has("Origin") && request.headers.has("Access-Control-Request-Method")) {
        // Handle CORS preflight requests.
        const headers: HeadersInit = {
          ...corsHeaders,
        };

        if (request.headers.has("Access-Control-Request-Headers")) {
          headers["Access-Control-Allow-Headers"] = request.headers.get("Access-Control-Request-Headers")!;
        }

        if (request.headers.get("Access-Control-Request-Private-Network") === "true") {
          headers["Access-Control-Allow-Private-Network"] = "true";
        }

        return new Response(null, { headers });
      } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
          headers: {
            Allow: "GET, HEAD, POST, OPTIONS",
          },
        });
      }
    }

    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return handleOptions(request);
    } else if (request.method === "GET" || request.method === "HEAD" || request.method === "POST") {
      // Handle requests to the API server
      return handleRequest(request);
    } else {
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    }
  },
} satisfies ExportedHandler<Env>;
