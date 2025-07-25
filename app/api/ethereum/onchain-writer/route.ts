import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { getAddress } from "ethers";
import { createSignature } from "@/app/lib/signature";
import axios from "axios";

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

async function verifyParagraphPost(address: Address): Promise<[boolean]> {
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

    const response = await axios.post<ArweaveResponse>(
      ARWEAVE_GRAPHQL_ENDPOINT,
      {
        query,
        variables: {
          contributor: address,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const posts = response.data?.data?.transactions?.edges || [];
    const postCount = posts.length;
    const hasPosted = postCount > 0;

    return [hasPosted];
  } catch (error) {
    console.error("Error verifying Paragraph post:", error);
    return [false];
  }
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

    // Validate and checksum the address
    let checksummedAddress: Address;
    try {
      checksummedAddress = getAddress(address) as Address;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid address checksum" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const [mint_eligibility] = await verifyParagraphPost(checksummedAddress);

    const signature = await createSignature({
      address: checksummedAddress,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
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
