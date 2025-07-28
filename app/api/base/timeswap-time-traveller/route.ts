import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

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
    const [mint_eligibility] = await verifyTimeswapLiquidity(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mint_eligibility as boolean,
        signature,
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
 * Verifies if an address has provided liquidity to Timeswap pools on Base
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 */
async function verifyTimeswapLiquidity(address: Address): Promise<[boolean]> {
  try {
    // Timeswap V2 Factory contract on Base
    const TIMESWAP_FACTORY = "0xA68dF33b095c2897123416cbd517ed314E46fF62";

    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Check if any transactions were interactions with Timeswap Factory
    const hasProvidedLiquidity = transactions.some(
      (tx) =>
        tx.to &&
        tx.to.toLowerCase() === TIMESWAP_FACTORY.toLowerCase() &&
        tx.isError === "0"
    );

    return [hasProvidedLiquidity];
  } catch (error) {
    console.error("Error verifying Timeswap liquidity:", error);
    throw new Error(
      `Failed to verify Timeswap liquidity: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
