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

async function hasCrvUsdTokens(address: Address): Promise<boolean> {
  try {
    // Ethereum crvUSD token
    const CRVUSD_TOKEN_ETH = "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E";

    // Base crvUSD token (bridged from Ethereum)
    const CRVUSD_TOKEN_BASE = "0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93";

    // Check Ethereum mainnet crvUSD balance
    try {
      const ethTokenBalance = (await mainnetClient.readContract({
        address: CRVUSD_TOKEN_ETH,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      if (ethTokenBalance > BigInt(0)) {
        return true;
      }
    } catch {
      console.log("No crvUSD tokens on Ethereum mainnet");
    }

    // Check Base chain crvUSD balance
    try {
      const baseTokenBalance = (await baseClient.readContract({
        address: CRVUSD_TOKEN_BASE,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      if (baseTokenBalance > BigInt(0)) {
        return true;
      }
    } catch {
      console.log("No crvUSD tokens on Base chain");
    }

    return false;
  } catch (error) {
    console.error("Error verifying crvUSD holdings:", error);
    throw new Error("Failed to verify crvUSD holdings");
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
    const mint_eligibility = await hasCrvUsdTokens(address as Address);

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
