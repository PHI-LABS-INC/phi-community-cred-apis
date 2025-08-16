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
  "0x79eF6103A513951a3b25743DB509E267685726B7" as Address;

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

/**
 * Verifies if an address has Balancer rETH/ETH LP position
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has Balancer rETH/ETH LP position
 */
async function hasBalancerRethEthLpPosition(
  address: Address
): Promise<boolean> {
  try {
    const balance = (await client.readContract({
      address: BALANCER_RETH_ETH_LP_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    return balance > BigInt(0);
  } catch (error) {
    console.error("Error verifying Balancer rETH/ETH LP position:", error);
    return false;
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
    const mint_eligibility = await hasBalancerRethEthLpPosition(
      address as Address
    );

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
