import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Create clients for both chains
const mainnetClient = createPublicClient({ chain: mainnet, transport: http() });
const baseClient = createPublicClient({ chain: base, transport: http() });

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
    // Ethereum stETH/ETH Curve pool LP token
    const STETH_ETH_LP_TOKEN_ETH = "0x06325440D014e39736583c165C2963BA99fAf14E";
    // Ethereum crvUSD/USDC Curve pool LP token
    const CRVUSD_USDC_LP_TOKEN_ETH =
      "0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E";

    // Base Curve pool LP tokens - using Stableswap-NG factory
    const CURVE_FACTORY_BASE = "0xd2002373543Ce3527023C75e7518C274A51ce712";

    // Check Ethereum mainnet LP positions
    try {
      const stethEthBalance = (await mainnetClient.readContract({
        address: STETH_ETH_LP_TOKEN_ETH,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const crvUsdUsdcBalance = (await mainnetClient.readContract({
        address: CRVUSD_USDC_LP_TOKEN_ETH,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      if (stethEthBalance > BigInt(0) || crvUsdUsdcBalance > BigInt(0)) {
        return true;
      }
    } catch {
      console.log("No Curve LP positions on Ethereum mainnet");
    }

    // Check Base chain LP positions - using factory to check for pool interactions
    try {
      // For Base, we'll check if the address has interacted with the Curve factory
      // This is a simplified approach since we can't easily enumerate all pools
      const hasFactoryInteraction = await hasContractInteraction(
        address,
        CURVE_FACTORY_BASE,
        [], // No specific method IDs required
        1, // At least 1 interaction
        8453 // Base chain
      );

      if (hasFactoryInteraction) {
        return true;
      }
    } catch {
      console.log("No Curve LP positions on Base chain");
    }

    return false;
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
