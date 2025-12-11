"use client";
import { useState } from "react";

export default function AddChatModal({
  isOpen,
  onClose,
  onCreateChat
}) {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-lg w-80 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Start New Chat</h2>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter partner's Gmail"
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded mb-4"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-700 rounded"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onCreateChat(email.trim());
              setEmail("");
            }}
            className="px-3 py-1 bg-blue-600 rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
