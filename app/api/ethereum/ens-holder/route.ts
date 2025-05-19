import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

if (!process.env.ETHEREUM_RPC_URL) {
  throw new Error("ETHEREUM_RPC_URL environment variable is not set");
}

// Create public client for mainnet using RPC from environment variable
const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL),
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

    // Generate cryptographic signature of the verification results
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
