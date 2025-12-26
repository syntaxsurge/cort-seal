export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
  };
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return Response.json(
    {
      openapi: "3.0.3",
      info: {
        title: "CortSeal API",
        version: "1.0.0",
        description:
          "Public validation and attestation surfaces for CortSeal (decentralized inference proofs).",
      },
      servers: [{ url: origin }],
      paths: {
        "/api/validate": {
          post: {
            summary: "Validate a claim against a URL source excerpt",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["url", "claim"],
                    properties: {
                      url: { type: "string", format: "uri" },
                      claim: { type: "string" },
                      runs: { type: "integer", minimum: 2, maximum: 5, default: 3 },
                    },
                  },
                },
              },
            },
            responses: {
              "200": { description: "Validation result + created seal metadata" },
              "400": { description: "Bad request" },
              "429": { description: "Rate limited" },
              "500": { description: "Server error" },
            },
          },
        },
        "/seal/{publicId}": {
          get: {
            summary: "Public seal page",
            parameters: [
              { name: "publicId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { "200": { description: "HTML" }, "404": { description: "Not found" } },
          },
        },
        "/api/seals/{publicId}": {
          get: {
            summary: "Download a seal as JSON",
            parameters: [
              { name: "publicId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { "200": { description: "Seal JSON" }, "404": { description: "Not found" } },
          },
        },
        "/api/badge/{publicId}.svg": {
          get: {
            summary: "SVG badge for a seal",
            parameters: [
              { name: "publicId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { "200": { description: "SVG image" }, "404": { description: "Not found" } },
          },
        },
        "/embed/{publicId}": {
          get: {
            summary: "Embed card (iframe-friendly) for a seal",
            parameters: [
              { name: "publicId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { "200": { description: "HTML" }, "404": { description: "Not found" } },
          },
        },
        "/api/openapi.json": {
          get: {
            summary: "OpenAPI schema for CortSeal public endpoints",
            responses: { "200": { description: "OpenAPI JSON" } },
          },
        },
      },
    },
    {
      headers: {
        ...corsHeaders(),
        "Cache-Control": "no-store",
      },
    }
  );
}

