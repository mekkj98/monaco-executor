import React, { useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";

const MonacoEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const editorRef = useRef<any>(null);

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Add custom type definitions for 'pm' object here
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
      declare const pm: {
        test: (name: string, fn: () => void) => void;
        expect: (target: any) => {
          to: {
            equal: (value: any) => void;
            be: {
              below: (value: number) => void;
              an: (type: string) => void;
            };
            exist: () => void;
          };
        };
        response: {
          code: number;
          responseTime: number;
          json: () => any;
        };
        environment: {
          get: (key: string) => any;
          set: (key: string, value: any) => void;
        };
        globals: {
          get: (key: string) => any;
          set: (key: string, value: any) => void;
        };
        variables: {
          get: (key: string) => any;
        };
        collectionVariables: {
          get: (key: string) => any;
        };
      };
    `,
      "ts:filename/pm.d.ts",
    );
  };

  return (
    <div>
      <Editor
        height="500px"
        defaultLanguage="javascript"
        onMount={handleEditorMount}
        value={value}
        onChange={(v) => onChange(v || "")}
        options={{
          minimap: { enabled: false },
        }}
      />
    </div>
  );
};

export default MonacoEditor;
