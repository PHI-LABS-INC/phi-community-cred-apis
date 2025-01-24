import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import PQueue from "p-queue";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { AccrualPosition } from "@morpho-org/blue-sdk-viem/lib/augment/Position";
import { MarketId } from "@morpho-org/blue-sdk";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const queue = new PQueue({ interval: 1000, intervalCap: 5 });

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  try {
    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const verificationResult = await queue.add(
      async () => await verifyMorphoLoanBase(address as Address)
    );
    const verificationData = verificationResult as [boolean, string];
    const [loan_eligibility, loan_data] = verificationData;

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: loan_eligibility,
      data: loan_data,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: loan_eligibility,
        data: loan_data,
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Verifies if an address has an active USDC loan on Morpho (Base)
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string loan details]
 * @throws Error if verification fails
 */
async function verifyMorphoLoanBase(
  address: Address
): Promise<[boolean, string]> {
  try {
    // WETH/USDC MarketId on Morpho Base
    const USDC_MARKET_ID =
      "0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda" as MarketId;

    const position = await AccrualPosition.fetch(
      address,
      USDC_MARKET_ID,
      client
    );

    const hasActiveLoan = position.borrowAssets > 0;
    const loanDetails = hasActiveLoan
      ? `Active loan with borrow assets: ${position.borrowAssets}`
      : "No active loan found";

    return [hasActiveLoan, loanDetails];
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to verify Morpho loan status: ${errorMessage}`);
  }
}
