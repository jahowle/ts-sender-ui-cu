"use client";

import { InputForm } from "./UI/InputField";
import { useState, useMemo } from "react";
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants";
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotal } from "@/utils";

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amounts, setAmounts] = useState("");
  const chainId = useChainId();
  const config = useConfig();
  const account = useAccount();
  const total: number = useMemo(() => calculateTotal(amounts), [amounts]);
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

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTokenAddress(e.target.value);
  };

  const handleRecipientsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRecipients(e.target.value);
  };

  const handleAmountsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAmounts(e.target.value);
  };

  async function handleSubmit() {
    const tSenderAddress = chainsToTSender[chainId]["tsender"];
    const approvedAmount = await getApprovedAmount(tSenderAddress);
    if (approvedAmount < total) {
      const approvalHash = await writeContractAsync({
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "approve",
        args: [tSenderAddress as `0x${string}`, BigInt(total)],
      });
      const approvalReceipt = await waitForTransactionReceipt(config, {
        hash: approvalHash,
      });
      if (approvalReceipt.status === "success") {
        console.log("Approval successful", approvalReceipt);
        await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress as `0x${string}`,
            recipients
              .split(",")
              .map((recipient) => recipient.trim() as `0x${string}`),
            amounts.split(",").map((amount) => BigInt(amount.trim())),
            BigInt(total),
          ],
        });
        console.log(recipients);
      } else {
        console.log("Approval failed", approvalReceipt);
      }
    } else {
      await writeContractAsync({
        abi: tsenderAbi,
        address: tSenderAddress as `0x${string}`,
        functionName: "airdropERC20",
        args: [
          tokenAddress as `0x${string}`,
          recipients
            .split(",")
            .map((recipient) => recipient.trim() as `0x${string}`),
          amounts.split(",").map((amount) => BigInt(amount.trim())),
          BigInt(total),
        ],
      });
      console.log(recipients);
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
        placeholder="100, 200, 300"
        value={amounts}
        onChange={handleAmountsChange}
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
      >
        {isPending ? "Processing..." : "Submit"}
      </button>
    </div>
  );
}
