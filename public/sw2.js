// See https://www.npmjs.com/package/ses documentation.
import * as ses from "https://esm.run/ses";
import * as chail from "https://cdnjs.cloudflare.com/ajax/libs/chai/4.3.4/chai.min.js";

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

const pm = {
  async sendRequest(requestOptions) {
    try {
      const response = await fetch(requestOptions.url, {
        method: requestOptions.method,
      });
      return response;
    } catch (error) {
      window.parent.postMessage(error.message || "unable to send request", "*");
    }
  },
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
    console.log(result);

    // Send result to parent
    window.parent.postMessage({ type: "testResult", result }, "*");
  },
  expect: chai.expect,
  environment: {
    get: (key) => `env_${key}`,
    set: (key, value) => console.log(`Set env ${key} = ${value}`),
  },
  globals: {
    get: (key) => `env_${key}`,
    set: (key, value) => console.log(`Set globals ${key} = ${value}`),
  },
  variables: {
    get: (key) => `env_${key}`,
    set: (key, value) => console.log(`Set globals ${key} = ${value}`),
  },
  collectionVariables: {
    get: (key) => `env_${key}`,
    set: (key, value) => console.log(`Set globals ${key} = ${value}`),
  },
};

const c = new Compartment({
  globals: {
    Math,
    console,
    pm: {
      response: simulateFetch({}),
      ...pm,
    },
  },
  __options__: true,
});
c.globalThis.Date = Date;

const transform = (source) => source.replace(/Farewell/g, "Welcome");
const transforms = [transform];
const code = `
  console.log(document, window, WebSocket, WebAssembly)
  pm.test("Check response code is 200", function () {
    pm.expect(pm.response.status).to.equal(200);
  });

  const response = await pm.response.json()
  console.log(response)
  pm.test("Response contains message", function () {
    pm.expect(response).to.have.property('message', 'Success');
  });  
`;
c.evaluate(`"use strict";(async () => { ${code} })()`, { transforms });
