import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Lens GraphQL API endpoint
const LENS_API_URL = "https://api.lens.xyz/graphql";

// GraphQL query to check if an address has a Lens profile using accountsBulk
const ACCOUNTS_BULK_QUERY = `
  query AccountBulk($request: AccountsBulkRequest!) {
    accountsBulk(request: $request) {
      username {
        localName
        ownedBy
      }
    }
  }
`;

// Type for the accountsBulk response
type AccountsBulkItem = {
  username: {
    localName: string;
    ownedBy: string;
  } | null;
};

/**
 * Verifies if an address has a Lens profile using the official Lens API (accountsBulk)
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has a Lens profile
 */
async function hasLensProfile(address: Address): Promise<boolean> {
  try {
    const response = await fetch(LENS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: ACCOUNTS_BULK_QUERY,
        variables: {
          request: {
            ownedBy: [address],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const accountsBulk: AccountsBulkItem[] = data?.data?.accountsBulk ?? [];

    // Check if the address has any Lens accounts with usernames
    return accountsBulk.some(
      (item) =>
        item.username &&
        item.username.localName &&
        item.username.localName.length > 0
    );
  } catch (error) {
    console.error("Error verifying Lens profile:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false;
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

    // Get verification result
    const mint_eligibility = await hasLensProfile(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
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
