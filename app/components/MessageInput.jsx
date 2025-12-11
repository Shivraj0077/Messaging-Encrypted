// components/MessageInput.jsx

export default function MessageInput({ value, onChange, onSend }) {
  return (
    <form onSubmit={onSend} style={{ display: "flex", gap: 8 }}>
      <input
        className="flex-1 p-3 text-white"
        placeholder="Message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="submit"
        style={{
          padding: "10px 15px",
          background: "#0070f3",
          border: "none",
          color: "white",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </form>
  );
}
