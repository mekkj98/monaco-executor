import * as acorn from "acorn";
import * as walk from "acorn-walk";

const MarkerSeverity = {
  "1": "Hint",
  "2": "Info",
  "4": "Warning",
  "8": "Error",
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

// Secure code validation function
export function validateUserScript(userCode: string) {
  const disallowedIdentifiers = [
    "document",
    "window",
    "global",
    "globals",
    "localStorage",
    "sessionStorage",
    "cookie",
    "XMLHttpRequest",
    "fetch",
    "WebSocket",
    "WebAssembly",
    "location",
    "history",
    "parent",
    "top",
    "opener",
    "crypto",
    "Notification",
    "alert",
    "prompt",
    "confirm",
    "navigator",
    "screen",
    "frames",
    "self",
    "Function",
    "Atomics",
    "SharedArrayBuffer",
    "Intl",
    "Performance",
    "Worker",
    "ServiceWorker",
    "BroadcastChannel",
    // "Blob",
    // "File",
    // "FileReader",
    // "URL",
    "Request",
    "Response",
    "Cache",
    "indexedDB",
    "AbortController",
    "AborSignal",
  ];
  const disallowedFunctions = [
    "eval",
    "Function",
    "setTimeout",
    "setInterval",
    "requestAnimationFrame",
    "requestIdleCallback",
    "importScripts",
    "postMessage",
    "queueMicrotask",
    "dispatchEvent",
    "addEventListener",
    "removeEventListener",
  ];

  const pmPrefix = "pm.";
  let isValid = true;
  let messages = [];
  let markers = [];

  try {
    // Parse the code into an AST using Acorn
    const asyncCode = `(async () => { ${userCode} })()`;
    const ast = acorn.parse(asyncCode, { ecmaVersion: 2020 });

    // Traverse the AST to inspect each node
    walk.simple(ast, {
      Identifier(node) {
        // Check for restricted identifiers (e.g., document, window)
        console.log("identifier", node);
        if (disallowedIdentifiers.includes(node.name)) {
          isValid = false;
          messages.push(
            `Invalid identifier '${node.name}' detected. Direct access to global objects is not allowed.`,
          );
          console.log(node.loc, "$loc", node);
          if (disallowedIdentifiers.includes(node.name)) {
            markers.push({
              message: `Invalid identifier '${node.name}' detected.`,
              severity: MarkerSeverity.Error,
              startLineNumber: node.loc?.start?.line || 0,
              startColumn: (node.loc?.start?.column || 0) + 1,
              endLineNumber: node.loc?.end?.line || 0,
              endColumn: (node.loc?.end?.column || 0) + 1,
            });
          }
        }
      },
      CallExpression(node) {
        // Check for disallowed functions (e.g., eval, Function)
        console.log("CallExpression", node);
        if (
          node.callee.type === "Identifier" &&
          disallowedFunctions.includes(node.callee.name)
        ) {
          isValid = false;
          messages.push(
            `Use of function '${node.callee.name}' is not allowed due to security risks.`,
          );

          if (disallowedIdentifiers.includes(node.callee.name)) {
            markers.push({
              message: `Invalid identifier '${node.callee.name}' detected.`,
              severity: MarkerSeverity.Error,
              startLineNumber: node.loc?.start?.line || 0,
              startColumn: (node.loc?.start?.column || 0) + 1,
              endLineNumber: node.loc?.end?.line || 0,
              endColumn: (node.loc?.end?.column || 0) + 1,
            });
          }
        }

        // Ensure only pm-prefixed functions are used
        // if (
        //   node.callee.type === "Identifier" &&
        //   !node.callee.name.startsWith(pmPrefix)
        // ) {
        //   isValid = false;
        //   messages.push(
        //     `Only pm-prefixed functions are allowed. '${node.callee.name}' is not permitted.`,
        //   );
        // }
      },
      MemberExpression(node) {
        // Check for any use of pm functions with restricted functionality
        // console.log("MemberExpression", node);
        // if (node.object.name === "pm") {
        //   const pmMethod = node.property.name;
        //   const allowedPmMethods = [
        //     "environment",
        //     "globals",
        //     "collectionVariables",
        //     "sendRequest",
        //     "test",
        //     "expect",
        //     "response",
        //   ];
        //   if (!allowedPmMethods.includes(pmMethod)) {
        //     isValid = false;
        //     messages.push(`The pm method '${pmMethod}' is not allowed.`);
        //   }
        // }
      },
    });
  } catch (err: any) {
    console.log(err);
    isValid = false;
    messages.push(`Error parsing code: ${err.message}`);
    markers.push({
      message: `Syntax error: ${err.message}`,
      severity: MarkerSeverity.Error,
      startLineNumber: err.loc.line || 0,
      startColumn: err.loc.column || 0,
      endLineNumber: err.loc.line || 0,
      endColumn: err.loc.column + 1,
    });
  }

  // Return the validation result
  return {
    isValid,
    messages,
    markers,
  };
}

// // Example usage
// const userCode = `
// // Sample user code to test
// pm.environment.set("variable_key", "value");
// document.querySelector("body").innerHTML = "<h1>Hacked!</h1>";
// `;
//
// const result = validateUserScript(userCode);
//
// if (result.isValid) {
//   console.log("Code is valid and safe to execute.");
// } else {
//   console.error("Code validation failed:", result.messages);
// }
