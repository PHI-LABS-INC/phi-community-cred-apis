import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Contract ABIs
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

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
    const mint_eligibility = await verifyZoraContentCoinBuyer(
      address as Address
    );

    // Generate cryptographic signature of the verification result
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
    console.error("Error in handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

/**
 * Verifies if an address holds any bal tokens (balance > 0)
 *
 * @param address - Ethereum address to check
 * @returns boolean eligibility status
 * @throws Error if verification fails
 */
async function verifyZoraContentCoinBuyer(address: Address): Promise<boolean> {
  try {
    const ZORA_CONTENT_COIN_BUYER =
      "0x1111111111166b7fe7bd91427724b487980afc69".toLowerCase();

    // Check token balance using viem
    const tokenBalance = (await client.readContract({
      address: ZORA_CONTENT_COIN_BUYER as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Determine eligibility
    const hasTokens = tokenBalance > BigInt(0);
    return hasTokens;
  } catch (error) {
    console.error("Error verifying Zora Content Coin Buyer:", error);
    throw new Error("Failed to verify Zora Content Coin Buyer");
  }
}
