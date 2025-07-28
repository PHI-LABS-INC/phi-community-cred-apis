import { NextRequest } from "next/server";
import {
  Address,
  isAddress,
  formatUnits,
  createPublicClient,
  http,
} from "viem";
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
    const [mint_eligibility] = await verifyGhstToken(address as Address);

    // Generate cryptographic signature of the verification results
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

/**
 * Verifies if an address holds GHST tokens
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string balance]
 * @throws Error if verification fails
 */

async function verifyGhstToken(address: Address): Promise<[boolean, string]> {
  try {
    // Define the GHST token contract address
    const GHST_CONTRACT = "0xcD2F22236DD9Dfe2356D7C543161D4d260FD9BcB";

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

    // Query Base blockchain for GHST token balance using viem
    const balance = (await client.readContract({
      address: GHST_CONTRACT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Use viem's formatUnits to safely handle the balance
    const balanceFormatted = formatUnits(balance, 18);
    const isEligible = balance > BigInt(0);

    return [isEligible, balanceFormatted];
  } catch (error) {
    console.error("Error verifying GHST token:", error);
    throw new Error("Failed to verify GHST token ownership");
  }
}
