import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Contract ABI for ERC20 balanceOf
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

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
    const [mint_eligibility] = await verifyANS(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(JSON.stringify({ mint_eligibility: mint_eligibility as boolean, signature }), {
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
 * Verifies if an address owns tokens from the specified contract
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 * @throws Error if verification fails
 */
async function verifyANS(address: Address): Promise<[boolean]> {
  try {
    const CONTRACT_ADDRESS = "0x6623206875C37bcEcF67c362d4dd1c96bD5C34d8";

    // Query token balance directly from contract
    const balance = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as number;

    const isEligible = balance > 0;

    return [isEligible];
  } catch (error) {
    console.error("Error verifying token ownership:", error);
    throw new Error("Failed to verify token ownership");
  }
}
