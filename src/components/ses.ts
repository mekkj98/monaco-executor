import * as chai from "chai";
import "ses";

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
export function simulateFetch(
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

function customFetch(requestInfo: RequestInfo, requestInit: RequestInit) {
  return fetch(requestInfo, requestInit);
}

class Environment {
  variables: Record<string, string | number> = {};

  constructor(variables: any) {
    this.variables = variables;
  }

  set(key: string, value: string) {
    this.variables[key] = value;
    window.postMessage({ type: "setEnv", key: key, value: value });
  }

  get(key: string) {
    return this.variables[key];
  }
}

// Create mock `pm` object for Postman-style testing
export const pm = {
  response: simulateFetch(mockJsonData),
  async sendRequest(requestInfo: RequestInfo, requestInit: RequestInit) {
    try {
      const response = await customFetch(requestInfo, requestInit);
      return await response.json();
    } catch (error) {
      window.postMessage("http://", "*");
    }
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

export function executePostScriptCodeCompartment(
  code: string,
  responseData: {
    body: any;
    type: string;
    headers: Record<string, string>;
    cookies: string[];
  },
  environmentVariables: Record<string, string | number>,
  propsContext: Record<any, any>,
) {
  const c = new Compartment({
    globals: {
      console: console,
      pm: {
        ...pm,
        environment: new Environment(environmentVariables),
        response: simulateFetch(
          responseData.body,
          responseData.type,
          new Headers(responseData.headers),
        ),
        ...propsContext,
      },
    },
    __options__: true,
  });

  const asyncCode = `(async () => { ${code} })()`;
  c.evaluate(asyncCode);
}
