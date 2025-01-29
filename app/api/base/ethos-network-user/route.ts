import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const ETHOS_CONTRACT_ADDRESS = "0x209820B843900Ef77BD639455cDE15F38A252a36";
const ETHOS_CONTRACT_ABI = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "profileIdByAddress",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Gets the profile ID for an address on Ethos Network
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, string]>} - Tuple containing eligibility status and profile data
 */
async function getEthosProfileData(
  address: Address
): Promise<[boolean, string]> {
  try {
    const profileId = (await client.readContract({
      address: ETHOS_CONTRACT_ADDRESS,
      abi: ETHOS_CONTRACT_ABI,
      functionName: "profileIdByAddress",
      args: [address],
    })) as bigint;

    const hasProfile = profileId !== BigInt(0);
    return [hasProfile, profileId.toString()];
  } catch (error) {
    console.error("Error checking Ethos profile:", error);
    throw new Error("Failed to verify Ethos Network profile.");
  }
}

/**
 * GET API Handler
 */
export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get profile data
    const [mint_eligibility, profileId] = await getEthosProfileData(
      address as Address
    );

    // Generate signature
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: profileId,
    });

    // Return structured response
    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: profileId,
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
