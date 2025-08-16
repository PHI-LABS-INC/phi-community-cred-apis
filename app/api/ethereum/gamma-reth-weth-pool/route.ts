import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Token contract addresses
const RETH_TOKEN = "0xae78736cd615f374d3085123a210448e74fc6393" as Address; // rETH
const WETH_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" as Address; // WETH

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
 * Verifies if an address has both rETH and WETH tokens
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has both rETH and WETH tokens
 */
async function hasRethAndWeth(address: Address): Promise<boolean> {
  try {
    // Check rETH balance
    const rethBalance = (await client.readContract({
      address: RETH_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Check WETH balance
    const wethBalance = (await client.readContract({
      address: WETH_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // User must have both rETH and WETH tokens
    return rethBalance > BigInt(0) && wethBalance > BigInt(0);
  } catch (error) {
    console.error("Error verifying rETH and WETH balances:", error);
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
    const mint_eligibility = await hasRethAndWeth(address as Address);

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
