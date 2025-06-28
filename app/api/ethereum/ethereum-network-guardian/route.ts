import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyEthereumNetworkGuardian(
  address: Address
): Promise<boolean> {
  try {
    console.log(
      "Checking Ethereum Network Guardian status for address:",
      address
    );

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Get all transactions from this address
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      const transactions = data.result;

      // Network Guardian criteria:
      // 1. High transaction volume > 100 transactions
      // 2. Involved in network infrastructure (staking, validation, governance)
      // 3. Long-term activity (active for a significant period)

      // Check for high transaction volume
      if (transactions.length < 100) {
        console.log(
          `Address ${address} has only ${transactions.length} transactions (< 100)`
        );
        return false;
      }

      // Check for ETH 2.0 deposit contract interactions (validator)
      const eth2DepositContract = "0x00000000219ab540356cbb839cbe05303d7705fa";
      const validatorDeposits = transactions.filter(
        (tx: { to?: string; value: string; isError: string }) =>
          tx.to?.toLowerCase() === eth2DepositContract.toLowerCase() &&
          tx.value === "32000000000000000000" && // 32 ETH
          tx.isError === "0"
      );

      // Check for governance participation (common governance contracts)
      const governanceContracts = [
        "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72", // ENS Governance
        "0x0000000000000000000000000000000000000000", // Placeholder for other governance
      ];

      const governanceParticipation = transactions.filter(
        (tx: { to?: string; isError: string }) =>
          tx.to &&
          governanceContracts.some(
            (contract) => tx.to!.toLowerCase() === contract.toLowerCase()
          ) &&
          tx.isError === "0"
      );

      // Check for MEV protection/flashloan interactions
      const mevProtectionContracts = [
        "0x1111111254fb6c44bac0bed2854e76f90643097d", // 1inch
        "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
        "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 Router
      ];

      const mevInteractions = transactions.filter(
        (tx: { to?: string; isError: string }) =>
          tx.to &&
          mevProtectionContracts.some(
            (contract) => tx.to!.toLowerCase() === contract.toLowerCase()
          ) &&
          tx.isError === "0"
      );

      // Calculate activity score
      let guardianScore = 0;

      // Base score for high transaction volume
      guardianScore += Math.min(transactions.length / 10, 50); // Max 50 points

      // Validator activity (high value)
      guardianScore += validatorDeposits.length * 30;

      // Governance participation
      guardianScore += governanceParticipation.length * 10;

      // MEV protection usage
      guardianScore += Math.min(mevInteractions.length, 20); // Max 20 points

      console.log(`Address ${address} Guardian Score: ${guardianScore}`);
      console.log(`- Transactions: ${transactions.length}`);
      console.log(`- Validator deposits: ${validatorDeposits.length}`);
      console.log(
        `- Governance participation: ${governanceParticipation.length}`
      );
      console.log(`- MEV interactions: ${mevInteractions.length}`);

      // Threshold for being considered a network guardian
      const threshold = 80;
      return guardianScore >= threshold;
    }

    console.log(`No transaction data found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying Ethereum Network Guardian status:", error);
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
      verifyEthereumNetworkGuardian
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
