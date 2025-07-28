import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaGithub } from "react-icons/fa";
import { FaHardHat } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
      {/* Left Section */}
      <div className="flex items-center space-x-3">
        {/* TSender Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TS</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">TSender</h1>
        </div>

        {/* GitHub Icon */}
        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
          <FaGithub className="text-white text-sm" />
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex items-center space-x-2 text-gray-500 italic">
        <span className="text-sm">Practice Project</span>
        <span className="text-lg">🐎</span>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Wallet Connection */}
        <ConnectButton />
      </div>
    </header>
  );
}
