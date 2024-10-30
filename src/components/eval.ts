import * as chai from "chai";

// pm.ts - Define the pm object to be used in the code execution.
// Mock data from your API response
const mockJsonData = {
  key1: "value1",
  key2: "value2",
};

// Mock headers and cookies (if required)
const mockHeaders = new Headers({
  "Content-Type": "application/json",
  "Set-Cookie": "sessionId=abc123; Path=/; Secure; HttpOnly",
});

// Function to simulate fetch response
function simulateFetch(
  responseData: any,
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
const pm = {
  response: simulateFetch(mockJsonData),
  async sendRequest(requestOptions: any) {
    try {
      const response = await fetch(requestOptions.url, {
        method: requestOptions.method,
      });
      return await response.json();
    } catch (error) {
      window.postMessage("http://", "*");
    }
  },
  environment: {
    get: (key: string) => `env_${key}`,
    set: (key: string, value: string) =>
      console.log(`Set env ${key} = ${value}`),
  },
  globals: {
    get: (key: string) => `global_${key}`,
    set: (key: string, value: string) =>
      console.log(`Set global ${key} = ${value}`),
  },
  variables: {
    get: (key: string) => `var_${key}`,
  },
  collectionVariables: {
    get: (key: string) => `collection_${key}`,
  },
  test: (name: string, fn: Function) => {
    let result = { name, status: "", message: "" };
    try {
      fn();
      result.status = "success";
      result.message = "Test passed successfully";
    } catch (err: any) {
      result.status = "fail";
      result.message = err.message;
    }
    // Send result back to main thread
    window.postMessage({ type: "testResult", result });
  },
  expect: chai.expect,
  // Replace Cheerio with browser-native DOMParser
  parseHTML: (htmlString: string) => {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html");
  },
};

// Define the safe scope by isolating the global context
export const safeEval = (
  code: string,
  context = {
    pm: {
      ...pm,
      response: simulateFetch(mockJsonData),
    },
  },
) => {
  // Wrapping code in an async function to support await
  const asyncCode = `(async () => { ${code} })()`;

  return Function(
    ...Object.keys(context),
    `"use strict"; return ${asyncCode};`,
  )(...Object.values(context));
};
