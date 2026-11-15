
import { useState } from "react";
import { useAuth } from "@clerk/react";
import { checkBackendAuth } from "../lib/clerkBackend";

export default function BackendAuthTest() {
  const { getToken, isSignedIn } = useAuth();
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    setResult("");

    try {
      const data = await checkBackendAuth(getToken);
      setResult(`Success! User ID: ${data.userId}`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={testConnection}
        disabled={!isSignedIn || loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Backend Authentication"}
      </button>

      {!isSignedIn && <p>Please sign in first.</p>}
      {result && <p className="mt-3 break-all">{result}</p>}
    </div>
  );
}
