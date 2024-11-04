// Import Chai (browser-compatible version)
importScripts("https://cdnjs.cloudflare.com/ajax/libs/chai/4.3.4/chai.min.js");

// Mock data from your API response

const mockHtmlData = `
  <div>
    <h1>Hello World!</h1>
    <p>This is a mock HTML response.</p>
  </div>
`;

// Mock headers and cookies (if required)
const mockHeaders = new Headers({
  "Content-Type": "application/json",
  "Set-Cookie": "sessionId=abc123; Path=/; Secure; HttpOnly",
});

// Function to simulate fetch response
function simulateFetch(
  responseData,
  responseType = "json",
  headers = mockHeaders,
  status = 200,
) {
  let body;
  if (responseType === "json") {
    body = JSON.stringify(responseData);
  } else if (responseType === "html") {
    body = responseData;
  }

  // Create a new Response object
  const response = new Response(body, {
    status: status,
    headers: headers,
  });

  return response;
}

// Create mock `pm` object for Postman-style testing

const safeEval = async (code, context = {}) => {
  // Wrapping code in an async function to support await
  const asyncCode = `(async () => { ${code} })();`;

  return Function(
    ...Object.keys(context),
    `"use strict"; return ${asyncCode}`,
  )(...Object.values(context));
};

const globalPm = {
  test: (name, fn) => {
    let result = { name, status: "", message: "" };
    try {
      fn();
      result.status = "success";
      result.message = "Test passed successfully";
    } catch (err) {
      result.status = "fail";
      result.message = err.message;
    }

    // Send result back to main thread
    self.clients.matchAll().then((all) =>
      all.forEach((client) => {
        client.postMessage({ type: "testResult", result });
      }),
    );
  },
  expect: chai.expect,
  // Replace Cheerio with browser-native DOMParser
  parseHTML: (htmlString) => {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html");
  },
};

class Environment {
  variables = {};

  constructor(variables) {
    this.variables = variables;
  }

  set(key, value) {
    this.variables[key] = value;

    self.clients.matchAll().then((all) =>
      all.forEach((client) => {
        client.postMessage({ type: "setEnv", key: key, value: value });
      }),
    );
  }

  get(key) {
    return this.variables[key];
  }
}

// Listen for incoming messages (from main thread)
self.addEventListener("message", async (event) => {
  const userCode = event.data.code;
  const environmentVariables = event.data.environmentVariables;
  const response = event.data.responseData;

  try {
    // Execute the user's code in a safe scope
    safeEval(userCode, {
      pm: {
        ...globalPm,
        response: simulateFetch(response.body, response.type, response.headers),
        environment: new Environment(environmentVariables),
      },
    });
  } catch (err) {
    console.log(err);
    // Send back error if user code execution fails
    self.clients.matchAll().then((all) =>
      all.forEach((client) => {
        client.postMessage({ type: "error", message: err.message });
      }),
    );
  }
});
