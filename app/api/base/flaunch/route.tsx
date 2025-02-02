import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { createSignature } from "@/app/lib/signature";
import { base } from "viem/chains";

const FLAUNCH_CONTRACT = "0x6A53F8b799bE11a2A3264eF0bfF183dCB12d9571";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyFlaunchActivity(address: Address): Promise<boolean> {
  try {
    const balance = await client.readContract({
      address: FLAUNCH_CONTRACT,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address],
    });

    return Number(balance) > 0;
  } catch (error) {
    console.error("Error verifying Flaunch activity:", error);
    throw new Error(
      `Failed to verify Flaunch activity: ${
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

    // Get verification results
    const mint_eligibility = await verifyFlaunchActivity(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
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
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
