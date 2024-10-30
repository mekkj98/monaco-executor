import { useCallback, useRef, useState } from "react";
import MonacoEditor from "./components/editor";
import SafeCodeExecutorIframe from "./components/iframe";
import { safeEval } from "./components/eval";

export default function App() {
  const [code, setCode] = useState(`
  pm.test("Check response code is 200", function () {
    pm.expect(pm.response.status).to.equal(200);
  });

  const response = await pm.response.json()
  console.log(response)
  pm.test("Response contains message", function () {
    pm.expect(response).to.have.property('message', 'Success');
  });    
`);
  const [mode, setMode] = useState<"iframe" | "worker" | "eval">("worker");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Array<{ name: string; status: string; message: string }>
  >([]);

  const onChange = (value: string) => {
    setCode(value);
  };

  const returnPostBack = useCallback((event: MessageEvent<any>) => {
    const data = event.data;
    if (data.type === "testResult") {
      setTestResults((prev) => [...prev, data.result]);
    } else if (data.type === "error") {
      setError(data.message);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      setTestResults([]);
      setError(null);
      window.removeEventListener("message", returnPostBack);
      if (mode === "worker") {
        await handleModeChange({ target: { value: mode } });
        if (worker) {
          worker.postMessage({ code: code, response: { a: "b" } });
        }
      }

      if (mode === "iframe") {
        // Post the user's code to the iframe
        if (iframeRef.current) {
          // Receive test results from iframe and update state
          window.addEventListener("message", returnPostBack);
          iframeRef.current.contentWindow?.postMessage(code, "*");
        }
      }

      if (mode === "eval") {
        window.addEventListener("message", returnPostBack);
        safeEval(code);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleModeChange = async (e: any) => {
    try {
      const value = e.target.value as "iframe" | "worker" | "eval";
      setMode(value);

      function returnPostBack(event: MessageEvent<any>) {
        const data = event.data;
        if (data.type === "testResult") {
          setTestResults((prev) => [...prev, data.result]);
        } else if (data.type === "error") {
          setError(data.message);
        }
      }

      if (value === "worker") {
        if (!registration && "serviceWorker" in navigator) {
          const register = await navigator.serviceWorker.register("/sw.js");
          setRegistration(register);
          setWorker(navigator.serviceWorker.controller);

          // Listen to messages from the service worker
          navigator.serviceWorker.addEventListener("message", returnPostBack);
        }
        return;
      }
    } catch (error: any) {
      console.error(error);
      setError(error?.message || error);
    }
  };

  return (
    <div>
      <div style={{ width: "100%" }}>
        <select value={mode} onChange={handleModeChange}>
          <option value="worker">worker</option>
          <option value="iframe">iframe</option>
          <option value="eval">eval</option>
        </select>
      </div>
      <div style={{ width: "100%" }}>
        <MonacoEditor value={code} onChange={onChange} />
      </div>
      <div>
        <button onClick={handleSubmit}>execute</button>
      </div>

      {testResults.length > 0 ? (
        <div id="result">
          {testResults.length > 0 ? (
            <>
              <h3>Test Results:</h3>
              <ul>
                {testResults.map((result, index) => (
                  <li
                    key={index}
                    style={{
                      color: result.status === "fail" ? "red" : "green",
                    }}
                  >
                    {result.name}: {result.status} - {result.message}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No results yet.</p>
          )}

          {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </div>
      ) : null}

      {mode === "iframe" ? <SafeCodeExecutorIframe ref={iframeRef} /> : null}
    </div>
  );
}
