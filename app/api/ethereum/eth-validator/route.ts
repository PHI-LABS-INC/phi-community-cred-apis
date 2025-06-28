import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

const ETH2_DEPOSIT_CONTRACT = "0x00000000219ab540356cbb839cbe05303d7705fa";

async function verifyEthValidator(address: Address): Promise<boolean> {
  try {
    console.log("Checking ETH validator status for address:", address);

    // Check if address has made deposits to ETH2 deposit contract
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Get all transactions from this address to the ETH2 deposit contract
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Filter transactions to ETH2 deposit contract
      const validatorDeposits = data.result.filter(
        (tx: { to?: string; value: string; isError: string; input: string }) =>
          tx.to?.toLowerCase() === ETH2_DEPOSIT_CONTRACT.toLowerCase() &&
          tx.value === "32000000000000000000" && // 32 ETH in wei
          tx.isError === "0" && // Only successful transactions
          tx.input &&
          tx.input.length > 2 // Has input data (deposit data)
      );

      if (validatorDeposits.length > 0) {
        console.log(
          `Found ${validatorDeposits.length} validator deposits for address ${address}`
        );
        return true;
      }
    }

    // Also check using beacon chain API if available
    try {
      // This is a fallback check - some beacon chain APIs might be available
      const beaconResponse = await fetch(
        `https://beaconcha.in/api/v1/validator/eth1/${address}`,
        {
          headers: {
            "User-Agent": "phi-community-cred-apis",
          },
        }
      );

      if (beaconResponse.ok) {
        const beaconData = await beaconResponse.json();
        if (beaconData.status === "OK" && beaconData.data?.length > 0) {
          console.log(
            `Found validators via beacon chain API for address ${address}`
          );
          return true;
        }
      }
    } catch (beaconError) {
      // Beacon chain API is optional, don't fail if it's unavailable
      console.warn("Beacon chain API unavailable:", beaconError);
    }

    console.log(`No ETH validator activity found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying ETH validator status:", error);
    return false;
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyEthValidator
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
