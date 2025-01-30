import { NextRequest } from "next/server";
import { Address, isAddress, formatUnits } from "viem";
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

    // Get verification results
    const [mint_eligibility, data] = await verifySuperUSDCHoldings(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(
      JSON.stringify({ mint_eligibility, data: data.toString(), signature }),
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
 * Verifies if an address holds at least 100,000 USDC on Base
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string data]
 * @throws Error if verification fails
 */
async function verifySuperUSDCHoldings(
  address: Address
): Promise<[boolean, string]> {
  try {
    const USDC_TOKEN = "0xe9F2a5F9f3c846f29066d7fB3564F8E6B6b2D65b";
    const MIN_TOKEN_AMOUNT = 1; // USDC for "super" holders

    // Check token balance using viem
    const tokenBalance = (await client.readContract({
      address: USDC_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Format token balance (USDC has 6 decimals)
    const formattedBalance = formatUnits(tokenBalance, 6);
    const hasEnoughTokens = parseFloat(formattedBalance) >= MIN_TOKEN_AMOUNT;
    const data = `${formattedBalance}`;

    return [hasEnoughTokens, data];
  } catch (error) {
    console.error("Error verifying USDC holdings:", error);
    throw new Error("Failed to verify USDC holdings");
  }
}
