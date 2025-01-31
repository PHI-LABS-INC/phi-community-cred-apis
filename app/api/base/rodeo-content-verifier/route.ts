import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

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

    // Get verification results
    const [mint_eligibility, data] = await verifyRodeoContent(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(JSON.stringify({ mint_eligibility, data, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address created content on Rodeo.club using GraphQL
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string total count]
 * @throws Error if verification fails
 */
async function verifyRodeoContent(
  address: Address
): Promise<[boolean, string]> {
  try {
    const RODEO_GRAPHQL_API =
      "https://api-v2.foundation.app/electric/v2/graphql";

    const createdQuery = `
      query CreatedTokens($address: Address!, $page: Int, $perPage: Limit) {
        createdTokens(accountAddress: $address, page: $page, perPage: $perPage) {
          totalItems
        }
      }
    `;

    const variables = {
      address: address,
      page: 0,
      perPage: 100,
    };

    const createdResponse = await fetch(RODEO_GRAPHQL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: createdQuery,
        variables,
        operationName: "CreatedTokens",
      }),
    });

    if (!createdResponse.ok) {
      throw new Error("Failed to fetch Rodeo data");
    }

    const createdData = await createdResponse.json();

    if (createdData.errors) {
      throw new Error("GraphQL query errors");
    }

    const createdCount = createdData.data.createdTokens.totalItems;

    return [createdCount > 0, createdCount.toString()];
  } catch (error) {
    console.error("Error verifying Rodeo content:", error);
    throw new Error("Failed to verify Rodeo content ownership");
  }
}
