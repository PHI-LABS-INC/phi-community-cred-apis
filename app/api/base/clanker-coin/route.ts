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
    const [mint_eligibility, data] = await verifyClankerCoin(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(JSON.stringify({ mint_eligibility, data, signature }), {
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
 * Verifies if an address has purchased a Clanker coin
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string balance]
 * @throws Error if verification fails
 */

async function verifyClankerCoin(address: Address): Promise<[boolean, string]> {
  try {
    // Define the Clanker coin contract address
    const CLANKER_CONTRACT = "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb";

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

    // Query Base blockchain for Clanker coin balance using viem
    const balance = (await client.readContract({
      address: CLANKER_CONTRACT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Use viem's formatUnits to safely handle the balance
    const balanceFormatted = formatUnits(balance, 18);
    const isEligible = balance > BigInt(0);

    return [isEligible, balanceFormatted];
  } catch (error) {
    console.error("Error verifying Clanker coin:", error);
    throw new Error("Failed to verify Clanker coin ownership");
  }
}
