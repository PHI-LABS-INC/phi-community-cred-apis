import { NextRequest } from "next/server";
import { Address, Hex, isAddress } from "viem";
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
    const [mint_eligibility] = await verifyRodeoContent(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mint_eligibility as boolean,
        signature: signature as Hex,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Verifies if an address created content on Rodeo.club using GraphQL
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string total count]
 * @throws Error if verification fails
 */
async function verifyRodeoContent(address: Address): Promise<[boolean]> {
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: createdQuery,
        variables,
        operationName: "CreatedTokens",
      }),
    });

    if (!createdResponse.ok) {
      throw new Error(
        `Failed to fetch Rodeo data: ${createdResponse.statusText}`
      );
    }

    const createdData = await createdResponse.json();

    if (createdData.errors) {
      throw new Error(
        `GraphQL query errors: ${JSON.stringify(createdData.errors)}`
      );
    }

    const createdCount = createdData.data.createdTokens.totalItems;
    const isEligible = createdCount > 0;

    return [isEligible];
  } catch (error) {
    console.error("Error verifying Rodeo content:", error);
    throw new Error(
      `Failed to verify Rodeo content ownership: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
