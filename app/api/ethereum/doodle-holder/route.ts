import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

async function verifyDoodlePurchase(address: Address): Promise<boolean> {
  try {
    // Doodles NFT contract address (target for purchase transactions)
    const DOODLES_CONTRACT =
      "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e" as Address;

    // Check if any transaction was sent to the Doodles contract
    return await hasContractInteraction(
      address,
      DOODLES_CONTRACT,
      [], // No specific method IDs required
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying Doodle purchase:", error);
    throw new Error("Failed to verify Doodle purchase");
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mint_eligibility = await verifyDoodlePurchase(address as Address);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error in Doodle purchase verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
