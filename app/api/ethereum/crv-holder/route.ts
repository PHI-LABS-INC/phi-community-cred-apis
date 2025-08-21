import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";

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

async function hasCrvTokens(address: Address): Promise<boolean> {
  try {
    // Ethereum CRV token
    const CRV_TOKEN_ETH = "0xD533a949740bb3306d119CC777fa900bA034cd52";

    // Base CRV token (bridged from Ethereum)
    const CRV_TOKEN_BASE = "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415";

    // Check Ethereum mainnet CRV balance
    try {
      const ethTokenBalance = (await mainnetClient.readContract({
        address: CRV_TOKEN_ETH,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      if (ethTokenBalance > BigInt(0)) {
        return true;
      }
    } catch {
      console.log("No CRV tokens on Ethereum mainnet");
    }

    // Check Base chain CRV balance
    try {
      const baseTokenBalance = (await baseClient.readContract({
        address: CRV_TOKEN_BASE,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      if (baseTokenBalance > BigInt(0)) {
        return true;
      }
    } catch {
      console.log("No CRV tokens on Base chain");
    }

    return false;
  } catch (error) {
    console.error("Error verifying CRV holdings:", error);
    throw new Error("Failed to verify CRV holdings");
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
    const mint_eligibility = await hasCrvTokens(address as Address);

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
