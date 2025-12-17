import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Create public client for Base chain
const client = createPublicClient({
  chain: base,
  transport: http()
});

// Wish token ABI for balanceOf
const wishABI = [{
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
    const mint_eligibility = await verifyWishToken(
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
 * Verifies if an address holds Wish tokens using direct contract call
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address holds any Wish tokens
 * @throws Error if verification fails
 */
async function verifyWishToken(address: Address): Promise<boolean> {
  try {
    // Wish token contract address
    const WISH_CONTRACT = "0xf5f7ec461ce97d0fa2396b3bff36656b63811b07" as const;

    // Direct contract call to get balance
    const balance = await client.readContract({
      address: WISH_CONTRACT,
      abi: wishABI,
      functionName: 'balanceOf',
      args: [address]
    });

    console.log(balance);

    // Convert BigInt to number for comparison since we're targeting lower than ES2020
    return Number(balance) > 0;
  } catch (error) {
    console.error("Error verifying Wish token:", error);
    throw new Error("Failed to verify Wish token balance"); 
  }
}

