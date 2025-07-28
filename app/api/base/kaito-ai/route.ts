import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

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
    const hasKaitoToken = await verifyKaitoToken(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: hasKaitoToken,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: hasKaitoToken, signature }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address holds Kaito tokens
 *
 * @param address - Ethereum address to check
 * @returns boolean eligibility status
 * @throws Error if verification fails
 */

async function verifyKaitoToken(address: Address): Promise<boolean> {
  try {
    // Define the Kaito token contract address
    const KAITO_CONTRACT = "0x98d0baa52b2D063E780DE12F615f963Fe8537553";

    // ERC20 balanceOf function ABI
    const ERC20_ABI = [
      {
        constant: true,
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
    ] as const;

    // Query Base blockchain for Kaito token balance using viem
    const balance = await client.readContract({
      address: KAITO_CONTRACT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    // Determine if the address holds Kaito tokens
    if (typeof balance === "bigint") {
      return balance > BigInt(0);
    } else {
      throw new Error("Unexpected balance type returned from contract");
    }
  } catch (error) {
    console.error("Error verifying Kaito token:", error);
    throw new Error("Failed to verify Kaito token ownership");
  }
}
