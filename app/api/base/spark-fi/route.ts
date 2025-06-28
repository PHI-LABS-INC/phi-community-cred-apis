import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { createSignature } from "@/app/lib/signature";
import { base } from "viem/chains";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

const USDS = "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyUSDSBalance(address: Address): Promise<boolean> {
  try {
    // Get USDS balance
    const balance = await client.readContract({
      address: USDS,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "account", type: "address" },
          ],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [address],
    });

    // Check if balance is at least 10 USDS (18 decimals)
    const minRequired = BigInt("10000000000000000000"); // 10 * 10^18

    return balance >= minRequired;
  } catch (error) {
    console.error("Error verifying USDS balance:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify USDS balance: ${
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
    const result = await verifyMultipleWalletsSimple(req, verifyUSDSBalance);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", {
      error,
      requestUrl: req.url,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: `Failed to process request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
