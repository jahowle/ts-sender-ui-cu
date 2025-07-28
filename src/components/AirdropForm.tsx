"use client";

import { InputForm } from "./UI/InputField";
import { useState, useMemo, useEffect } from "react";
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants";
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotal, parseTokenAmount } from "@/utils";

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("airdrop_tokenAddress") || "";
    }
    return "";
  });
  const [recipients, setRecipients] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("airdrop_recipients") || "";
    }
    return "";
  });
  const [amounts, setAmounts] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("airdrop_amounts") || "";
    }
    return "";
  });
  const [isAwaitingUser, setIsAwaitingUser] = useState(false);
  const [isTransactionSubmitted, setIsTransactionSubmitted] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenName, setTokenName] = useState("");
  const chainId = useChainId();
  const config = useConfig();
  const account = useAccount();
  const total: number = useMemo(() => calculateTotal(amounts), [amounts]);
  const totalHumanReadable = useMemo(() => {
    if (!amounts.trim()) return "0";
    const totalAmount = amounts.split(",").reduce((sum, amount) => {
      const parsed = parseFloat(amount.trim());
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    return totalAmount.toString();
  }, [amounts]);
  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  async function getApprovedAmount(
    tSenderAddress: string | null
  ): Promise<number> {
    if (!tSenderAddress) {
      alert("No tSender address found");
      return 0;
    }
    const response = await readContract(config, {
      abi: erc20Abi,
      address: tokenAddress as `0x${string}`,
      functionName: "allowance",
      args: [account.address, tSenderAddress as `0x${string}`],
    });
    return response as number;
  }

  async function getTokenDecimals(): Promise<number> {
    if (!tokenAddress) return 18;
    try {
      const response = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "decimals",
      });
      return response as number;
    } catch (error) {
      console.log("Could not fetch token decimals, using default 18");
      return 18;
    }
  }

  async function getTokenName(): Promise<string> {
    if (!tokenAddress) return "";
    try {
      const response = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "name",
      });
      return response as string;
    } catch (error) {
      console.log("Could not fetch token name");
      return "";
    }
  }

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setTokenAddress(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("airdrop_tokenAddress", value);
    }
  };

  const handleRecipientsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setRecipients(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("airdrop_recipients", value);
    }
  };

  const handleAmountsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setAmounts(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("airdrop_amounts", value);
    }
  };

  // Fetch token decimals and name when token address changes
  useEffect(() => {
    if (tokenAddress) {
      getTokenDecimals().then(setTokenDecimals);
      getTokenName().then(setTokenName);
    } else {
      setTokenName("");
    }
  }, [tokenAddress]);

  async function handleSubmit() {
    const tSenderAddress = chainsToTSender[chainId]["tsender"];

    // Parse amounts to proper token units
    const parsedAmounts = amounts
      .split(",")
      .map((amount) => parseTokenAmount(amount.trim(), tokenDecimals));
    const totalAmount = parsedAmounts.reduce(
      (sum, amount) => sum + amount,
      BigInt(0)
    );

    const approvedAmount = await getApprovedAmount(tSenderAddress);

    if (approvedAmount < totalAmount) {
      try {
        setIsAwaitingUser(true);
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddress as `0x${string}`,
          functionName: "approve",
          args: [tSenderAddress as `0x${string}`, totalAmount],
        });
        setIsAwaitingUser(false);
        setIsTransactionSubmitted(true);

        const approvalReceipt = await waitForTransactionReceipt(config, {
          hash: approvalHash,
        });

        if (approvalReceipt.status === "success") {
          console.log("Approval successful", approvalReceipt);
          setIsAwaitingUser(true);
          const airdropHash = await writeContractAsync({
            abi: tsenderAbi,
            address: tSenderAddress as `0x${string}`,
            functionName: "airdropERC20",
            args: [
              tokenAddress as `0x${string}`,
              recipients
                .split(",")
                .map((recipient) => recipient.trim() as `0x${string}`),
              parsedAmounts,
              totalAmount,
            ],
          });
          setIsAwaitingUser(false);
          setIsTransactionSubmitted(true);

          const airdropReceipt = await waitForTransactionReceipt(config, {
            hash: airdropHash,
          });

          if (airdropReceipt.status === "success") {
            console.log("Airdrop successful", airdropReceipt);
            // Clear form data after successful transaction
            if (typeof window !== "undefined") {
              localStorage.removeItem("airdrop_tokenAddress");
              localStorage.removeItem("airdrop_recipients");
              localStorage.removeItem("airdrop_amounts");
            }
            setTokenAddress("");
            setRecipients("");
            setAmounts("");
            setTokenName("");
          } else {
            console.log("Airdrop failed", airdropReceipt);
          }

          // Reset states after transaction completes
          setIsTransactionSubmitted(false);
          console.log(recipients);
        } else {
          console.log("Approval failed", approvalReceipt);
          setIsTransactionSubmitted(false);
        }
      } catch (error) {
        setIsAwaitingUser(false);
        setIsTransactionSubmitted(false);
        console.log("User rejected approval transaction");
      }
    } else {
      try {
        setIsAwaitingUser(true);
        const airdropHash = await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress as `0x${string}`,
            recipients
              .split(",")
              .map((recipient) => recipient.trim() as `0x${string}`),
            parsedAmounts,
            totalAmount,
          ],
        });
        setIsAwaitingUser(false);
        setIsTransactionSubmitted(true);

        const airdropReceipt = await waitForTransactionReceipt(config, {
          hash: airdropHash,
        });

        if (airdropReceipt.status === "success") {
          console.log("Airdrop successful", airdropReceipt);
          // Clear form data after successful transaction
          if (typeof window !== "undefined") {
            localStorage.removeItem("airdrop_tokenAddress");
            localStorage.removeItem("airdrop_recipients");
            localStorage.removeItem("airdrop_amounts");
          }
          setTokenAddress("");
          setRecipients("");
          setAmounts("");
          setTokenName("");
        } else {
          console.log("Airdrop failed", airdropReceipt);
        }

        // Reset states after transaction completes
        setIsTransactionSubmitted(false);
        console.log(recipients);
      } catch (error) {
        setIsAwaitingUser(false);
        setIsTransactionSubmitted(false);
        console.log("User rejected airdrop transaction");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-8">
      <InputForm
        label="Address"
        placeholder="0x..."
        value={tokenAddress}
        onChange={handleAddressChange}
      />
      <InputForm
        label="Recipients"
        placeholder="0x1234, 0x5678, 0x90AB"
        value={recipients}
        onChange={handleRecipientsChange}
      />
      <InputForm
        label="Amounts"
        placeholder="1, 2.5, 0.1"
        value={amounts}
        onChange={handleAmountsChange}
      />

      {/* Transaction Details Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Transaction Details
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">Token Name:</span>
            <span className="text-gray-800 font-semibold">
              {tokenName || "Enter token address"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">Amount:</span>
            <span className="text-gray-800 font-semibold">
              {totalHumanReadable} {tokenName ? "tokens" : ""}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={isAwaitingUser || isTransactionSubmitted}
      >
        {(isAwaitingUser || isTransactionSubmitted) && (
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {isAwaitingUser
          ? "Confirm in MetaMask..."
          : isTransactionSubmitted
          ? "Processing..."
          : "Submit"}
      </button>
    </div>
  );
}
