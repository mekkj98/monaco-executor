import * as chai from "chai";

const executorGlobals = {
  async sendRequest(requestInfo: RequestInfo, requestInit: RequestInit) {
    try {
      const response = await fetch(requestInfo, requestInit);
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
    window.postMessage({ type: "testResult", result });
  },
  expect: chai.expect,
  parseHTML: (htmlString: string) => {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html");
  },
};

export const getNewExecutorGlobals = (responseData: any) => {};
