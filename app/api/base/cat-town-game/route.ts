import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Test address for verification: 0xe24449034d0B0C9c083F9a2c194ccB273b493467
export async function GET(req: NextRequest) {
  try {
    // Get address from query parameters
    const address = req.nextUrl.searchParams.get("address");

    // Validate address exists
    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate address format
    if (!isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if address meets game requirements
    const [mint_eligibility, data] = await verifyCatTownGame(
      address as Address
    );

    // Generate signature for verified address
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    // Return successful response with verification results
    return new Response(
      JSON.stringify({
        mint_eligibility,
        data,
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
    console.error("Error in API handler:", error);
    // Return failed verification instead of error response for better UX
    return new Response(
      JSON.stringify({
        mint_eligibility: false,
        data: "Failed to verify Cat Town Game eligibility",
        signature: null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

/**
 * Verifies if an address meets the Cat Town Game requirements:
 * 1. Holds at least 1000 Kibble tokens
 * 2. Owns at least one Cat Town NFT
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string data]
 * @throws Error if contract interactions fail
 */
async function verifyCatTownGame(address: Address): Promise<[boolean, string]> {
  try {
    // Contract addresses for token and NFT
    const KIBBLE_CONTRACT = "0x64cc19A52f4D631eF5BE07947CABA14aE00c52Eb";
    const NFT_CONTRACT = "0xb46cAE60Bf243f1060ffab43611CA808966BF1cB";
    const REQUIRED_AMOUNT = BigInt("1000000000000000000000"); // 1000 tokens with 18 decimals

    // Initialize Viem client for Base network
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Check Kibble token balance using ERC20 balanceOf
    const balance = await client.readContract({
      address: KIBBLE_CONTRACT as `0x${string}`,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address],
    });

    // Check NFT balance using ERC721 balanceOf
    const nftBalance = await client.readContract({
      address: NFT_CONTRACT as `0x${string}`,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address],
    });

    // Determine eligibility based on both requirements
    const hasEnoughKibble = balance >= REQUIRED_AMOUNT;
    const ownsNFT = nftBalance > BigInt(0);
    const isEligible = hasEnoughKibble && ownsNFT;

    // Format verification data as JSON string
    const data = JSON.stringify({
      hasEnoughKibble,
      ownsNFT,
      kibbleBalance: balance.toString(),
      nftBalance: nftBalance.toString()
    });

    return [isEligible, data];
  } catch (error) {
    console.error("Error verifying Cat Town Game eligibility:", error);
    return [false, "Failed to verify Cat Town Game eligibility"];
  }
}
