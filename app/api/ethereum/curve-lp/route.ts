import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
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

async function hasCurveLpPosition(address: Address): Promise<boolean> {
  try {
    // stETH/ETH Curve pool LP token
    const STETH_ETH_LP_TOKEN = "0x06325440D014e39736583c165C2963BA99fAf14E";

    // crvUSD/USDC Curve pool LP token
    const CRVUSD_USDC_LP_TOKEN = "0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E";

    // Check stETH/ETH LP token balance
    const stethEthBalance = (await client.readContract({
      address: STETH_ETH_LP_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Check crvUSD/USDC LP token balance
    const crvUsdUsdcBalance = (await client.readContract({
      address: CRVUSD_USDC_LP_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Determine eligibility - has any LP position
    const hasLpPosition =
      stethEthBalance > BigInt(0) || crvUsdUsdcBalance > BigInt(0);
    return hasLpPosition;
  } catch (error) {
    console.error("Error verifying Curve LP position:", error);
    throw new Error("Failed to verify Curve LP position");
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

    // Get verification result
    const mint_eligibility = await hasCurveLpPosition(address as Address);

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
