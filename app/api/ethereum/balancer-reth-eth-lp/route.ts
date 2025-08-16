import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Balancer rETH/ETH V2 pool LP token contract address
const BALANCER_RETH_ETH_LP_TOKEN =
  "0x1e19cf2d73a72ef1332c882f20534b6519be0276000200000000000000000112" as Address;

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function hasBalancerRethEthLpPosition(address: Address): Promise<{
  mint_eligibility: boolean;
  balance: string;
}> {
  try {
    const balance = (await client.readContract({
      address: BALANCER_RETH_ETH_LP_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    const mint_eligibility = balance > BigInt(0);
    const balanceInLp = Number(balance) / Math.pow(10, 18); // LP token has 18 decimals

    return {
      mint_eligibility,
      balance: balanceInLp.toFixed(6),
    };
  } catch (error) {
    console.error("Error verifying Balancer rETH/ETH LP position:", error);
    throw new Error("Failed to verify Balancer rETH/ETH LP position");
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
    const result = await hasBalancerRethEthLpPosition(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        data: result.balance,
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
