import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// ✅ List of Aerodrome Gauges you care about (add more as needed)
const GAUGES: Address[] = [
  //https://aerodrome.finance/deposit?token0=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&token1=0x940181a94a35a4569e4529a3cdfb74e38fd98631&type=-1&chain0=8453&chain1=8453&factory=0x420DD381b31aEf6683db6B902084cB0FFECe40Da
  "0x4F09bAb2f0E15e2A078A227FE1537665F55b8360", // AERO/USDC gauge
  //https://aerodrome.finance/deposit?token0=0x4200000000000000000000000000000000000006&token1=0x940181a94a35a4569e4529a3cdfb74e38fd98631&type=-1&chain0=8453&chain1=8453&factory=0x420DD381b31aEf6683db6B902084cB0FFECe40Da
  "0x96a24aB830D4ec8b1F6f04Ceac104F1A3b211a01", // AERO/WETH gauge
  //https://aerodrome.finance/deposit?token0=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&token1=0x940181a94a35a4569e4529a3cdfb74e38fd98631&type=2000&chain0=8453&chain1=8453&factory=0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A
  "0x430C09546ae9249AB75B9A4ef7B5FD9a4006D6f3", // AERO/USDC gauge
];

const gaugeAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function hasStakedLiquidity(address: Address): Promise<boolean> {
  try {
    for (const gauge of GAUGES) {
      console.log(`Checking gauge ${gauge} for address ${address}`);

      const balance = await client.readContract({
        address: gauge,
        abi: gaugeAbi,
        functionName: "balanceOf",
        args: [address],
      });

      console.log(`Balance for gauge ${gauge}: ${balance}`);

      if (balance && balance > 0) {
        return true; // ✅ User has staked LPs in this gauge
      }
    }
    return false;
  } catch (error) {
    console.error("Error verifying Aerodrome liquidity stakes:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Aerodrome liquidity stakes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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

    const mint_eligibility = await hasStakedLiquidity(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
