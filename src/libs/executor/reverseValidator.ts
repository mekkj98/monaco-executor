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

// Helper function to check if a method is allowed based on the prototype it belongs to
function isAllowedDataStructureMethod(methodName: string, objectName: string) {
  const dataStructureMethods: Record<string, string[]> = {
    Array: Object.getOwnPropertyNames(Array.prototype),
    Object: Object.getOwnPropertyNames(Object.prototype),
    Map: Object.getOwnPropertyNames(Map.prototype),
    Set: Object.getOwnPropertyNames(Set.prototype),
    String: Object.getOwnPropertyNames(String.prototype),
  };
  return dataStructureMethods[objectName]?.includes(methodName);
}

// Secure code validation function
export function reverseValidateUserScript(userCode: string) {
  const allowedIdentifiers = [
    "pm",
    "Array",
    "Object",
    "Map",
    "WeakMap",
    "Set",
    "WeakSet",
    "String",
    "Promise",
    "console",
  ];
  const allowedFunctions: string[] = [];
  const disallowedGlobals = [
    "window",
    "document",
    "fetch",
    "cookie",
    "localStorage",
    "ServiceWorker",
  ];

  let isValid = true;
  let messages = [];
  let markers = [];
  const userDeclaredIdentifiers = new Set();

  try {
    // Parse the code into an AST using Acorn
    const asyncCode = `(async () => { ${userCode} })()`;
    const ast = acorn.parse(asyncCode, { ecmaVersion: 2020, locations: true });

    // Traverse the AST to inspect each node
    walk.simple(ast, {
      VariableDeclarator(node) {
        if (node.id && node.id.name) {
          userDeclaredIdentifiers.add(node.id.name);
        }
      },
      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          userDeclaredIdentifiers.add(node.id.name);
        }
      },
      Identifier(node) {
        const { name } = node;
        // Check for global identifiers, ignoring user-declared ones
        if (
          !allowedIdentifiers.includes(name) &&
          !userDeclaredIdentifiers.has(name) &&
          !allowedFunctions.includes(name)
        ) {
          isValid = false;
          messages.push(`Usage of '${name}' is not allowed.`);
          markers.push({
            message: `Usage of '${name}' is not allowed.`,
            severity: MarkerSeverity.Error,
            startLineNumber: node.loc.start.line,
            startColumn: node.loc.start.column + 1,
            endLineNumber: node.loc.end.line,
            endColumn: node.loc.end.column + 1,
          });
        }
      },
      MemberExpression(node) {
        const objectName = node.object.name;
        const methodName = node.property.name;

        // Allow 'pm' object and its properties/methods
        if (objectName === "pm") {
          return;
        }

        // Allow methods of allowed data structures
        if (
          (userDeclaredIdentifiers.has(objectName) ||
            allowedIdentifiers.includes(objectName)) &&
          isAllowedDataStructureMethod(methodName, objectName)
        ) {
          return;
        }
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier") {
          // Allow user-defined function calls
          if (userDeclaredIdentifiers.has(node.callee.name)) {
            return;
          }

          // Check for disallowed function calls
          if (!allowedFunctions.includes(node.callee.name)) {
            isValid = false;
            messages.push(
              `Use of function '${node.callee.name}' is not allowed due to security risks.`,
            );
            markers.push({
              message: `Use of function '${node.callee.name}' is not allowed due to security risks.`,
              severity: MarkerSeverity.Error,
              startLineNumber: node.loc.start.line,
              startColumn: node.loc.start.column + 1,
              endLineNumber: node.loc.end.line,
              endColumn: node.loc.end.column + 1,
            });
          }
        }
      },
      WhileStatement(node) {
        // Check for potential infinite loops
        if (node.test.type === "Literal" && node.test.value === true) {
          isValid = false;
          messages.push(`Potential infinite loop detected.`);
          markers.push({
            message: `Potential infinite loop detected.`,
            severity: MarkerSeverity.Warning,
            startLineNumber: node.loc.start.line,
            startColumn: node.loc.start.column + 1,
            endLineNumber: node.loc.end.line,
            endColumn: node.loc.end.column + 1,
          });
        }
      },
      IfStatement(node) {
        // Allow if/else statements without additional checks
        return;
      },
    });
  } catch (err: any) {
    isValid = false;
    messages.push(`Error parsing code: ${err.message}`);
    markers.push({
      message: `Syntax error: ${err.message}`,
      severity: MarkerSeverity.Error,
      startLineNumber: err.loc.line || 0,
      startColumn: err.loc.column || 0,
      endLineNumber: err.loc.line || 0,
      endColumn: (err.loc.column || 0) + 1,
    });
  }

  return {
    isValid,
    messages,
    markers,
  };
}
// ---
// import * as acorn from "acorn";
// import * as walk from "acorn-walk";
//
// const MarkerSeverity = {
//   "1": "Hint",
//   "2": "Info",
//   "4": "Warning",
//   "8": "Error",
//   Hint: 1,
//   Info: 2,
//   Warning: 4,
//   Error: 8,
// };
//
// // Helper function to check if a method is allowed based on the prototype it belongs to
// function isAllowedDataStructureMethod(methodName: string, objectName: string) {
//   const dataStructureMethods: Record<string, string[]> = {
//     Array: Object.getOwnPropertyNames(Array.prototype),
//     Object: Object.getOwnPropertyNames(Object.prototype),
//     Map: Object.getOwnPropertyNames(Map.prototype),
//     WeakMap: Object.getOwnPropertyNames(WeakMap.prototype),
//     Set: Object.getOwnPropertyNames(Set.prototype),
//     WeakSet: Object.getOwnPropertyNames(WeakSet.prototype),
//     String: Object.getOwnPropertyNames(String.prototype),
//   };
//   return dataStructureMethods[objectName]?.includes(methodName);
// }
//
// // Secure code validation function
// export function reverseValidateUserScript(userCode: string) {
//   const allowedIdentifiers = [
//     "pm",
//     "Array",
//     "Object",
//     "Map",
//     "WeakMap",
//     "Set",
//     "WeakSet",
//     "String",
//     "console",
//     "Promise",
//   ];
//   const allowedFunctions: string[] = [];
//
//   let isValid = true;
//   let messages = [];
//   let markers = [];
//   const userDeclaredIdentifiers = new Set();
//
//   try {
//     // Parse the code into an AST using Acorn
//     const asyncCode = `(async () => { ${userCode} })()`;
//     const ast = acorn.parse(asyncCode, { ecmaVersion: 2020, locations: true });
//
//     // Traverse the AST to inspect each node
//     walk.simple(ast, {
//       VariableDeclarator(node) {
//         if (node.id && node.id.name) {
//           userDeclaredIdentifiers.add(node.id.name);
//         }
//       },
//       FunctionDeclaration(node) {
//         if (node.id && node.id.name) {
//           userDeclaredIdentifiers.add(node.id.name);
//         }
//       },
//       Identifier(node) {
//         const { name } = node;
//         // Check for global identifiers, ignoring user-declared ones
//         if (
//           !allowedIdentifiers.includes(name) &&
//           !userDeclaredIdentifiers.has(name)
//         ) {
//           isValid = false;
//           messages.push(`Invalid identifier '${name}' detected.`);
//           markers.push({
//             message: `Invalid identifier '${name}' detected.`,
//             severity: MarkerSeverity.Error,
//             startLineNumber: node.loc.start.line,
//             startColumn: node.loc.start.column + 1,
//             endLineNumber: node.loc.end.line,
//             endColumn: node.loc.end.column + 1,
//           });
//         }
//       },
//       MemberExpression(node) {
//         const objectName = node.object.name;
//         const methodName = node.property.name;
//
//         // Allow 'pm' object and its properties/methods
//         if (objectName === "pm") return;
//
//         // Allow methods of allowed data structures
//         if (
//           (userDeclaredIdentifiers.has(objectName) ||
//             allowedIdentifiers.includes(objectName)) &&
//           isAllowedDataStructureMethod(methodName, objectName)
//         ) {
//           return;
//         }
//       },
//       CallExpression(node) {
//         // Check for disallowed function calls
//         if (
//           node.callee.type === "Identifier" &&
//           !allowedFunctions.includes(node.callee.name)
//         ) {
//           isValid = false;
//           messages.push(
//             `Use of function '${node.callee.name}' is not allowed due to security risks.`,
//           );
//           markers.push({
//             message: `Use of function '${node.callee.name}' is not allowed due to security risks.`,
//             severity: MarkerSeverity.Error,
//             startLineNumber: node.loc.start.line,
//             startColumn: node.loc.start.column + 1,
//             endLineNumber: node.loc.end.line,
//             endColumn: node.loc.end.column + 1,
//           });
//         }
//       },
//       WhileStatement(node) {
//         // Check for potential infinite loops
//         if (node.test.type === "Literal" && node.test.value === true) {
//           isValid = false;
//           messages.push(`Potential infinite loop detected.`);
//           markers.push({
//             message: `Potential infinite loop detected.`,
//             severity: MarkerSeverity.Warning,
//             startLineNumber: node.loc.start.line,
//             startColumn: node.loc.start.column + 1,
//             endLineNumber: node.loc.end.line,
//             endColumn: node.loc.end.column + 1,
//           });
//         }
//       },
//       IfStatement(node) {
//         // Allow if/else statements without additional checks
//         return;
//       },
//     });
//   } catch (err: any) {
//     isValid = false;
//     messages.push(`Error parsing code: ${err.message}`);
//     markers.push({
//       message: `Syntax error: ${err.message}`,
//       severity: MarkerSeverity.Error,
//       startLineNumber: err.loc.line || 0,
//       startColumn: err.loc.column || 0,
//       endLineNumber: err.loc.line || 0,
//       endColumn: (err.loc.column || 0) + 1,
//     });
//   }
//
//   return {
//     isValid,
//     messages,
//     markers,
//   };
// }
// ---
// import * as acorn from "acorn";
// import * as walk from "acorn-walk";
//
// const MarkerSeverity = {
//   "1": "Hint",
//   "2": "Info",
//   "4": "Warning",
//   "8": "Error",
//   Hint: 1,
//   Info: 2,
//   Warning: 4,
//   Error: 8,
// };
//
// // Helper function to check if a method is allowed based on the prototype it belongs to
// function isAllowedDataStructureMethod(methodName: string, objectName: string) {
//   const dataStructureMethods: Record<string, string[]> = {
//     Array: Object.getOwnPropertyNames(Array.prototype),
//     Object: Object.getOwnPropertyNames(Object.prototype),
//     Map: Object.getOwnPropertyNames(Map.prototype),
//     Set: Object.getOwnPropertyNames(Set.prototype),
//     String: Object.getOwnPropertyNames(String.prototype),
//   };
//   return dataStructureMethods[objectName]?.includes(methodName);
// }
//
// // Secure code validation function
// export function reverseValidateUserScript(userCode: string) {
//   const allowedIdentifiers = [
//     "pm",
//     "URL",
//     "console",
//     "response",
//     "Array",
//     "Map",
//     "WeakMap",
//     "Set",
//     "WeakSet",
//     "String",
//     "URL",
//   ];
//   const allowedFunctions: string[] = [];
//
//   let isValid = true;
//   let messages = [];
//   let markers = [];
//   const userDeclaredIdentifiers = new Set();
//
//   try {
//     // Parse the code into an AST using Acorn
//     const asyncCode = `(async () => { ${userCode} })()`;
//     const ast = acorn.parse(asyncCode, { ecmaVersion: 2020, locations: true });
//
//     // Traverse the AST to inspect each node
//     walk.simple(ast, {
//       VariableDeclarator(node) {
//         // Add locally declared variables to the set of user-declared identifiers
//         if (node.id && node.id.name) {
//           userDeclaredIdentifiers.add(node.id.name);
//         }
//       },
//       FunctionDeclaration(node) {
//         if (node.id && node.id.name) {
//           userDeclaredIdentifiers.add(node.id.name);
//         }
//       },
//       Identifier(node) {
//         const { name } = node;
//         // Check for global identifiers, ignoring user-declared ones
//         if (
//           !allowedIdentifiers.includes(name) &&
//           !userDeclaredIdentifiers.has(name)
//         ) {
//           isValid = false;
//           messages.push(`Invalid identifier '${name}' detected.`);
//           markers.push({
//             message: `Invalid identifier '${name}' detected.`,
//             severity: MarkerSeverity.Error,
//             startLineNumber: node.loc.start.line,
//             startColumn: node.loc.start.column + 1,
//             endLineNumber: node.loc.end.line,
//             endColumn: node.loc.end.column + 1,
//           });
//         }
//       },
//       CallExpression(node) {
//         // Check for disallowed function calls
//         if (
//           node.callee.type === "Identifier" &&
//           !allowedFunctions.includes(node.callee.name)
//         ) {
//           isValid = false;
//           messages.push(
//             `Use of function '${node.callee.name}' is not allowed due to security risks.`,
//           );
//           markers.push({
//             message: `Use of function '${node.callee.name}' is not allowed due to security risks.`,
//             severity: MarkerSeverity.Error,
//             startLineNumber: node.loc.start.line,
//             startColumn: node.loc.start.column + 1,
//             endLineNumber: node.loc.end.line,
//             endColumn: node.loc.end.column + 1,
//           });
//         }
//
//         // Allow methods on data structures
//         if (node.callee.type === "MemberExpression") {
//           const objectName = node.callee.object.name;
//           const methodName = node.callee.property.name;
//
//           // If object is a user-defined variable or allowed identifier, check its method
//           if (
//             (userDeclaredIdentifiers.has(objectName) ||
//               allowedIdentifiers.includes(objectName)) &&
//             isAllowedDataStructureMethod(methodName, objectName)
//           ) {
//             // Skip validation for allowed data structure methods
//             return;
//           }
//         }
//       },
//     });
//   } catch (err: any) {
//     isValid = false;
//     messages.push(`Error parsing code: ${err.message}`);
//     markers.push({
//       message: `Syntax error: ${err.message}`,
//       severity: MarkerSeverity.Error,
//       startLineNumber: err.loc.line || 0,
//       startColumn: err.loc.column || 0,
//       endLineNumber: err.loc.line || 0,
//       endColumn: (err.loc.column || 0) + 1,
//     });
//   }
//
//   // Return the validation result
//   return {
//     isValid,
//     messages,
//     markers,
//   };
// }
// ---
// import * as acorn from "acorn";
// import * as walk from "acorn-walk";
//
// const MarkerSeverity = {
//   "1": "Hint",
//   "2": "Info",
//   "4": "Warning",
//   "8": "Error",
//   Hint: 1,
//   Info: 2,
//   Warning: 4,
//   Error: 8,
// };
//
// // Secure code validation function
// export function reverseValidateUserScript(userCode: string) {
//   const allowedIdentifiers = ["pm", "URL", "console", "response"];
//   const allowedFunctions = [
//     "eval",
//     "Function",
//     "setTimeout",
//     "setInterval",
//     "requestAnimationFrame",
//     "requestIdleCallback",
//     "importScripts",
//     "postMessage",
//     "queueMicrotask",
//     "dispatchEvent",
//     "addEventListener",
//     "removeEventListener",
//   ];
//
//   // const pmPrefix = "pm.";
//   let isValid = true;
//   let messages = [];
//   let markers = [];
//
//   try {
//     // Parse the code into an AST using Acorn
//     const asyncCode = `(async () => { ${userCode} })()`;
//     const ast = acorn.parse(asyncCode, { ecmaVersion: 2020 });
//
//     // Traverse the AST to inspect each node
//     walk.simple(ast, {
//       Identifier(node) {
//         // Check for restricted identifiers (e.g., document, window)
//         console.log("identifier", node);
//         if (!allowedIdentifiers.includes(node.name)) {
//           isValid = false;
//           messages.push(
//             `Invalid identifier '${node.name}' detected. Direct access to global objects is not allowed.`,
//           );
//           // console.log(node.loc, "$loc", node);
//           if (!allowedIdentifiers.includes(node.name)) {
//             markers.push({
//               message: `Invalid identifier '${node.name}' detected.`,
//               severity: MarkerSeverity.Error,
//               startLineNumber: node.loc?.start?.line || 0,
//               startColumn: (node.loc?.start?.column || 0) + 1,
//               endLineNumber: node.loc?.end?.line || 0,
//               endColumn: (node.loc?.end?.column || 0) + 1,
//             });
//           }
//         }
//       },
//       CallExpression(node) {
//         // Check for disallowed functions (e.g., eval, Function)
//         console.log("CallExpression", node);
//         if (
//           node.callee.type === "Identifier" &&
//           allowedFunctions.includes(node.callee.name)
//         ) {
//           isValid = false;
//           messages.push(
//             `Use of function '${node.callee.name}' is not allowed due to security risks.`,
//           );
//
//           if (allowedIdentifiers.includes(node.callee.name)) {
//             markers.push({
//               message: `Invalid identifier '${node.callee.name}' detected.`,
//               severity: MarkerSeverity.Error,
//               startLineNumber: node.loc?.start?.line || 0,
//               startColumn: (node.loc?.start?.column || 0) + 1,
//               endLineNumber: node.loc?.end?.line || 0,
//               endColumn: (node.loc?.end?.column || 0) + 1,
//             });
//           }
//         }
//
//         // Ensure only pm-prefixed functions are used
//         // if (
//         //   node.callee.type === "Identifier" &&
//         //   !node.callee.name.startsWith(pmPrefix)
//         // ) {
//         //   isValid = false;
//         //   messages.push(
//         //     `Only pm-prefixed functions are allowed. '${node.callee.name}' is not permitted.`,
//         //   );
//         // }
//       },
//       MemberExpression(_node) {
//         // Check for any use of pm functions with restricted functionality
//         console.log("MemberExpression", _node);
//         // if (node.object.name === "pm") {
//         //   const pmMethod = node.property.name;
//         //   const allowedPmMethods = [
//         //     "environment",
//         //     "globals",
//         //     "collectionVariables",
//         //     "sendRequest",
//         //     "test",
//         //     "expect",
//         //     "response",
//         //   ];
//         //   if (!allowedPmMethods.includes(pmMethod)) {
//         //     isValid = false;
//         //     messages.push(`The pm method '${pmMethod}' is not allowed.`);
//         //   }
//         // }
//       },
//     });
//   } catch (err: any) {
//     // console.log(err);
//     isValid = false;
//     messages.push(`Error parsing code: ${err.message}`);
//     markers.push({
//       message: `Syntax error: ${err.message}`,
//       severity: MarkerSeverity.Error,
//       startLineNumber: err.loc.line || 0,
//       startColumn: err.loc.column || 0,
//       endLineNumber: err.loc.line || 0,
//       endColumn: err.loc.column + 1,
//     });
//   }
//
//   // Return the validation result
//   return {
//     isValid,
//     messages,
//     markers,
//   };
// }
//
// // // Example usage
// // const userCode = `
// // // Sample user code to test
// // pm.environment.set("variable_key", "value");
// // document.querySelector("body").innerHTML = "<h1>Hacked!</h1>";
// // `;
// //
// // const result = validateUserScript(userCode);
// //
// // if (result.isValid) {
// //   console.log("Code is valid and safe to execute.");
// // } else {
// //   console.error("Code validation failed:", result.messages);
// // }
