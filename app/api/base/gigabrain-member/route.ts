import { NextRequest } from "next/server";
import { Address, isAddress, formatUnits } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Contract ABIs
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const ERC721_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
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
    const [mint_eligibility, data] = await verifyGigaBrainHoldings(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(
      JSON.stringify({ mint_eligibility, data: data.toString(), signature }),
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
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

/**
 * Verifies if an address holds either a GigaBrain Pass NFT or at least 1M GigaBrain tokens
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string data]
 * @throws Error if verification fails
 */
async function verifyGigaBrainHoldings(
  address: Address
): Promise<[boolean, string]> {
  try {
    const GIGABRAIN_TOKEN = "0xCE1eAB31756A48915B7E7bb79C589835aAc6242d";
    const GIGABRAIN_PASS = "0xea1a0Fc81b6ca435D39141dA38fe493A21a83298";
    const MIN_TOKEN_AMOUNT = 1_000_000; // 1M tokens

    // Check token balance using viem
    const tokenBalance = (await client.readContract({
      address: GIGABRAIN_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Check NFT balance using viem
    const nftBalance = (await client.readContract({
      address: GIGABRAIN_PASS,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // Format token balance
    const formattedBalance = formatUnits(tokenBalance, 18);
    const hasEnoughTokens = parseFloat(formattedBalance) >= MIN_TOKEN_AMOUNT;
    const hasPass = nftBalance > 0;

    const isEligible = hasEnoughTokens || hasPass;
    const data = `${formattedBalance},${hasPass}`;

    return [isEligible, data];
  } catch (error) {
    console.error("Error verifying GigaBrain holdings:", error);
    throw new Error("Failed to verify GigaBrain holdings");
  }
}
