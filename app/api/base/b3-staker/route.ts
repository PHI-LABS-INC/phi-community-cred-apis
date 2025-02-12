import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server"; // Added import for NextRequest

const B3_CONTRACT = "0xB3B32F9f8827D4634fE7d973Fa1034Ec9fdDB3B3";
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
];

// Set up the public client for the Base network
const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyB3TokenHolder(address: Address): Promise<[boolean]> {
  try {
    // Retrieve the token balance from the B3 contract using the ERC20 balanceOf function
    const balance = (await client.readContract({
      address: B3_CONTRACT,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Define the required balance: 1000 tokens (assuming 18 decimals)
    const requiredBalance = BigInt(1000) * BigInt(10 ** 18);
    const isEligible = balance >= requiredBalance;
    return [isEligible];
  } catch (error) {
    console.error("Error verifying B3 token balance:", error);
    throw new Error("Failed to verify B3 token balance");
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify if the wallet holds at least 1000 B3 tokens
    const [mint_eligibility] = await verifyB3TokenHolder(address as Address);

    // Generate a signature including the verification result and the retrieved token balance
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
    console.error("Error in B3 token verification handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
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
