import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

const JESSE_CONTRACT = "0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59" as Address;
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
] as const;

// Set up the public client for the Base network
const client = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Verifies if an address holds at least 100 JESSE tokens
 * Primary method: Direct contract call to get balance
 * Fallback method: Check transaction history for interactions with JESSE contract
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address holds at least 100 JESSE tokens
 */
async function verifyJesseTokenHolder(address: Address): Promise<boolean> {
  try {
    // Primary method: Direct contract call to get balance
    const balance = (await client.readContract({
      address: JESSE_CONTRACT,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Define the required balance: 100 tokens (assuming 18 decimals)
    const requiredBalance = BigInt(100) * BigInt(10 ** 18);
    const isEligible = balance >= requiredBalance;
    return isEligible;
  } catch (error) {
    console.warn(
      "Direct contract call failed, falling back to transaction history:",
      error
    );

    // Fallback method: Use transaction history to verify interactions
    try {
      // Check if address has interacted with JESSE contract using smart-wallet utility
      const hasJesseInteraction = await hasContractInteraction(
        address,
        JESSE_CONTRACT,
        [], // No specific method IDs - check for any interaction
        1, // At least 1 interaction
        8453 // Base chain
      );

      if (!hasJesseInteraction) {
        return false;
      }

      console.warn(
        "Fallback method cannot verify exact balance. Contract call required for accurate verification."
      );
      return false;
    } catch (fallbackError) {
      console.error("Fallback verification also failed:", fallbackError);
      throw new Error("Failed to verify JESSE token balance");
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify if the wallet holds at least 100 JESSE tokens
    const mint_eligibility = await verifyJesseTokenHolder(address as Address);

    // Generate a signature including the verification result
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
    console.error("Error in JESSE token verification handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
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
