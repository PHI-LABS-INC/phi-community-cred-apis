import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// Create public client for mainnet
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

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
    const mint_eligibility = await verifyEnsHolder(address as Address);

    return new Response(
      JSON.stringify({
        mint_eligibility,
        address: address as Address,
        ensName: mint_eligibility ? await getEnsName(address as Address) : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has an ENS name
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has an ENS name
 * @throws Error if verification fails
 */
async function verifyEnsHolder(address: Address): Promise<boolean> {
  try {
    const ensName = await client.getEnsName({
      address: address,
    });

    return Boolean(ensName);
  } catch (error) {
    console.error("Error verifying ENS holder:", error);
    throw new Error("Failed to verify ENS ownership");
  }
}

/**
 * Gets the ENS name for an address
 *
 * @param address - Ethereum address to check
 * @returns ENS name if it exists, null otherwise
 */
async function getEnsName(address: Address): Promise<string | null> {
  try {
    return await client.getEnsName({
      address: address,
    });
  } catch (error) {
    console.error("Error fetching ENS name:", error);
    return null;
  }
}
