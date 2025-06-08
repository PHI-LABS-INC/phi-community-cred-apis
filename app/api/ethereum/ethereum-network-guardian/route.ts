import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Lido stETH contract address on Ethereum mainnet
const STETH_CONTRACT = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

// Create public client for Ethereum mainnet
const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL),
});

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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

    const mint_eligibility = await verifyLidoStaking(address as Address);
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
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function verifyLidoStaking(address: Address): Promise<boolean> {
  try {
    console.log("Checking Lido staking for address:", address);

    if (!process.env.ETHEREUM_RPC_URL) {
      throw new Error("ETHEREUM_RPC_URL environment variable is not set");
    }

    // Get stETH balance from Lido contract
    const stEthBalance = await client.readContract({
      address: STETH_CONTRACT,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    // Convert balance from wei to ETH for logging
    const balanceInEth = Number(stEthBalance) / 1e18;
    console.log(`Address ${address} has ${balanceInEth} stETH`);

    // Any amount of stETH means they have staked on Lido
    return stEthBalance > BigInt(0);
  } catch (error) {
    console.error("Error verifying Lido staking:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}
