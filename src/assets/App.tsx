import React, { useState, useEffect } from "react";

const App: React.FC = () => {
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  const [testResults, setTestResults] = useState<
    Array<{ name: string; status: string; message: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Register the service worker on component mount
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          setWorker(navigator.serviceWorker.controller);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  const handleSubmit = () => {
    const userCode = `
      pm.test("Check response code is 200", function () {
        pm.expect(pm.response.code).to.equal(200);
      });

      pm.test("Response contains message", function () {
        pm.expect(pm.response.json()).to.have.property('message', 'Success');
      });
      
      const $ = pm.parseHTML('<div><h1>Hello World</h1></div>');
      pm.test("Check DOM content", function() {
        const h1  = doc.querySelector('h1')
        pm.expect(h1.textContent).to.equal('Hello World');
      });
    `;

    // Reset results before sending new code
    setTestResults([]);
    setError(null);

    if (worker) {
      worker.postMessage({ code: userCode });
    }
  };

  useEffect(() => {
    if (worker) {
      // Listen to messages from the service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        const data = event.data;
        console.log(data);
        if (data.type === "testResult") {
          setTestResults((prev) => [...prev, data.result]);
        } else if (data.type === "error") {
          setError(data.message);
        }
      });
    }
  }, [worker]);

  return (
    <div>
      <h1>Code Execution with Service Worker</h1>

      <button onClick={handleSubmit}>Run User Code</button>

      <h3>Test Results:</h3>
      {testResults.length > 0 ? (
        <ul>
          {testResults.map((result, index) => (
            <li
              key={index}
              style={{ color: result.status === "fail" ? "red" : "green" }}
            >
              {result.name}: {result.status} - {result.message}
            </li>
          ))}
        </ul>
      ) : (
        <p>No results yet.</p>
      )}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
};

export default App;

// import "./styles.css";
// import MonacoEditor from "./editor/index";

// export default function App() {
//   return (
//     <div className="App">
//       <MonacoEditor />
//     </div>
//   );
// }
