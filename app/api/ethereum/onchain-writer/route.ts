import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// GraphQL endpoint for Arweave
const ARWEAVE_GRAPHQL_ENDPOINT = "https://arweave.net/graphql";

interface ArweaveResponse {
  data?: {
    transactions?: {
      edges?: Array<{
        node: {
          id: string;
        };
      }>;
    };
  };
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const [mint_eligibility, data] = await verifyParagraphPost(
      address as Address
    );

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, data, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function verifyParagraphPost(
  address: Address
): Promise<[boolean, number]> {
  try {
    console.log("Checking Paragraph posts for address:", address);

    const query = `
      query GetParagraphPosts($contributor: String!) {
        transactions(
          tags: [
            { name: "AppName", values: ["Paragraph"] }
            { name: "Contributor", values: [$contributor] }
          ]
          sort: HEIGHT_DESC
          first: 100
        ) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const response = await fetch(ARWEAVE_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          contributor: address,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = (await response.json()) as ArweaveResponse;
    const posts = result.data?.transactions?.edges || [];
    const postCount = posts.length;
    const hasPosted = postCount > 0;

    return [hasPosted, postCount];
  } catch (error) {
    console.error("Error verifying Paragraph post:", error);
    return [false, 0];
  }
}
