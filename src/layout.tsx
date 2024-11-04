import { useCallback, useEffect, useState } from "react";
import MonacoEditor from "./components/editor";
import { safeEval } from "./components/eval";
import { validateUserScript } from "./libs/executor/validator";
import { executePostScriptCodeCompartment } from "./components/ses";

export default function App() {
  const [code, setCode] =
    useState(`// -- parsing response data and testing the response data --
const response = await pm.response.json()
console.log(response)

// -- getting and setting environment variables --
console.log("env_app", pm.environment.get("app"));
pm.environment.set("app", "some_other_app");
console.log("env_app", pm.environment.get("app"));
pm.environment.set("app", "intelliprobe");

// -- checking for response code --
pm.test("Check response code is 200", function () {
  pm.expect(pm.response.status).to.equal(200);
});

pm.test("Response contains message", function () {
  pm.expect(response).to.have.property('message', 'Success');
});    

// -- testing invalid usage of code --
// console.log(window)
// console.log(document)
// console.log(fetch)
// console.log(cookie)
// console.log(localStorage)
// console.log(ServiceWorker)
`);
  const [mode, setMode] = useState<"container" | "worker" | "eval">("worker");

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);

  // -- validation states --
  const [validatorMessages, setValidatorMessages] = useState<string[]>([]);
  const [validatorMarkers, setValidatorMarkers] = useState<
    {
      message: string;
      severity: number;
      startLineNumber: any;
      startColumn: any;
      endLineNumber: any;
      endColumn: any;
    }[]
  >([]);

  // -- execution states --
  const [executionConsole, setExecutionConsole] = useState<any[]>([]);
  const [executionError, setExecutionError] = useState<string>("");
  const [executionTestResults, setExecutionTestResults] = useState<
    Array<{ name: string; status: string; message: string }>
  >([]);

  // -- variables --
  const [environmentVariables, setEnvironmentVariables] = useState<
    Record<string, string | number>
  >({ app: "intelliprobe", version: 1 });
  const [responseData, _setResponseData] = useState<{
    body: any;
    type: string;
    headers: Record<string, string>;
    cookies: string[];
  }>({
    body: { key1: "value1" },
    type: "json",
    headers: {},
    cookies: [],
  });

  useEffect(() => {
    handleModeChange({ target: { value: "worker" } });
  }, []);

  const onChange = (value: string) => {
    setCode(value);
  };

  const returnPostBack = useCallback((event: MessageEvent<any>) => {
    const data = event.data;
    if (data.type === "testResult") {
      setExecutionTestResults((prev) => [...prev, data.result]);
    } else if (data.type === "setEnv") {
      if (data.key && typeof data.value !== "undefined") {
        setEnvironmentVariables((prev) => ({
          ...prev,
          [data.key as string]: data.value,
        }));
        setExecutionConsole((p) => [...p, { ...data }]);
      }
    } else if (data.type === "console") {
      setExecutionConsole((prev) => [...prev, data.message]);
    } else if (data.type === "error") {
      setExecutionError(data.message);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      setValidatorMessages([]);
      setValidatorMarkers([]);
      setExecutionTestResults([]);
      setExecutionConsole([]);
      setExecutionError("");
      window.removeEventListener("message", returnPostBack);

      const result = validateUserScript(code);
      if (!result.isValid) {
        setValidatorMessages(result.messages);
        setValidatorMarkers(result.markers);
        return;
      }

      if (mode === "worker") {
        await handleModeChange({ target: { value: mode } });
        if (worker) {
          worker.postMessage({
            code: code,
            environmentVariables: environmentVariables,
            responseData: responseData,
          });
        }
      }

      if (mode === "eval") {
        window.addEventListener("message", returnPostBack);
        safeEval(code, responseData, environmentVariables, {});
      }

      if (mode === "container") {
        window.addEventListener("message", returnPostBack);
        executePostScriptCodeCompartment(
          code,
          responseData,
          environmentVariables,
          {},
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleModeChange = async (e: any) => {
    try {
      const value = e.target.value as "container" | "worker" | "eval";
      setMode(value);

      setExecutionTestResults([]);
      setExecutionConsole([]);
      setExecutionError("");

      if (value === "worker" && !worker) {
        if (!registration && "serviceWorker" in navigator) {
          const register = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          setRegistration(register);
          if (!navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              setWorker(navigator.serviceWorker.controller);
            });
          } else {
            setWorker(navigator.serviceWorker.controller);
          }

          // Listen to messages from the service worker
          navigator.serviceWorker.addEventListener("message", returnPostBack);
        }
        return;
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div>
      <div style={{ width: "100%" }}>
        <select value={mode} onChange={handleModeChange}>
          <option value="worker">worker</option>
          <option value="container">container</option>
          <option value="eval">eval</option>
        </select>
      </div>
      <div style={{ width: "100%" }}>
        <MonacoEditor
          markers={validatorMarkers}
          value={code}
          onChange={onChange}
        />
      </div>
      <div>
        <button disabled={mode === "worker" && !worker} onClick={handleSubmit}>
          execute
        </button>
      </div>

      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        <div style={{ borderRight: "1px solid #eee", padding: "0px 8px" }}>
          <h6>Validation Messages</h6>
          {validatorMessages?.length ? (
            <div>
              <ul>
                {validatorMessages.map((m) => {
                  return (
                    <li key={m} style={{ color: "red" }}>
                      {m}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div style={{ borderRight: "1px solid #eee", padding: "0px 8px" }}>
          <h6>Execution Logs</h6>
          {executionConsole?.length ? (
            <div>
              <ul style={{ fontSize: "12px" }}>
                {executionConsole.map((m, i) => {
                  if (typeof m === "string")
                    return <li key={`executionConsole-${i}`}>{m}</li>;
                  if (typeof m === "object") {
                    return (
                      <li key={`executionConsole-${i}`}>{JSON.stringify(m)}</li>
                    );
                  }
                  return <li key={`executionConsole-${i}`}>{m}</li>;
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div style={{ padding: "0px 8px" }}>
          <h6>Execution Result</h6>

          {executionTestResults.length > 0 ? (
            <div>
              <ul>
                {executionTestResults.map((result, index) => (
                  <li
                    key={`executionTestResults-${index}`}
                    style={{
                      color: result.status === "fail" ? "red" : "green",
                    }}
                  >
                    {result.name}: {result.status} - {result.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No results yet.</p>
          )}

          <h6>Execution Error:</h6>
          {executionError ? (
            <p style={{ color: "red" }}>Error: {executionError}</p>
          ) : (
            <p>None</p>
          )}
        </div>
      </div>
    </div>
  );
}
