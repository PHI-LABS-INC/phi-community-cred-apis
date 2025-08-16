import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Rocket Pool Node Manager contract
const ROCKET_POOL_NODE_MANAGER =
  "0x1d8f8f00cfa6758d7be78336684788fb0ee0fa46" as Address;

// Method IDs for node operator functions
const SET_WITHDRAWAL_ADDRESS_METHOD_ID = "0x3d18b912"; // setWithdrawalAddress
const REGISTER_NODE_METHOD_ID = "0x4a25d94a"; // registerNode

async function isRocketPoolNodeOperator(address: Address): Promise<boolean> {
  try {
    // Check if the address has interacted with Rocket Pool Node Manager
    // using either setWithdrawalAddress or registerNode methods
    return await hasContractInteraction(
      address,
      ROCKET_POOL_NODE_MANAGER,
      [SET_WITHDRAWAL_ADDRESS_METHOD_ID, REGISTER_NODE_METHOD_ID],
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying Rocket Pool Node Operator:", error);
    throw new Error("Failed to verify Rocket Pool Node Operator");
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
