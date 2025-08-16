import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Rocket Pool Node Manager contract
const ROCKET_POOL_NODE_MANAGER =
  "0x1d8f8f00cfa6758d7be78336684788fb0ee0fa46" as Address;

/**
 * Verifies if an address has interacted with Rocket Pool Node Manager
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has interacted with Rocket Pool Node Manager
 */
async function isRocketPoolNodeOperator(address: Address): Promise<boolean> {
  try {
    // Check if the address has interacted with Rocket Pool Node Manager
    // without checking for specific method IDs
    return await hasContractInteraction(
      address,
      ROCKET_POOL_NODE_MANAGER,
      [], // No method ID restrictions - check for any interaction
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error(
      "Error verifying Rocket Pool Node Manager interaction:",
      error
    );
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

    const mint_eligibility = await isRocketPoolNodeOperator(address as Address);

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
