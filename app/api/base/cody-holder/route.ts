import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Create public client for Base chain
const client = createPublicClient({
  chain: base,
  transport: http()
});

// Cody token ABI for balanceOf
const codyABI = [{
  "inputs": [{"name": "account", "type": "address"}],
  "name": "balanceOf",
  "outputs": [{"name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
}] as const;

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
    const mint_eligibility = await verifyCodyToken(
      address as Address
    );

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
 * Verifies if an address holds Cody tokens using direct contract call
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address holds any Cody tokens
 * @throws Error if verification fails
 */
async function verifyCodyToken(address: Address): Promise<boolean> {
  try {
    // Cody token contract address
    const CODY_CONTRACT = "0x3977fc913db86b01a257232c568317798b903b07" as const;

    // Direct contract call to get balance
    const balance = await client.readContract({
      address: CODY_CONTRACT,
      abi: codyABI,
      functionName: 'balanceOf',
      args: [address]
    });

    console.log(balance);

    // Convert BigInt to number for comparison since we're targeting lower than ES2020
    return Number(balance) > 0;
  } catch (error) {
    console.error("Error verifying Cody token:", error);
    throw new Error("Failed to verify Cody token balance"); 
  }
}

