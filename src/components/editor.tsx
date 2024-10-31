import React, { useEffect, useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

const MonacoEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  markers: any[];
}> = ({ value, onChange, markers }) => {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      console.log(model, "model$");
      if (model) {
        monaco.editor.setModelMarkers(model, "owner", markers);
      }
    }
  }, [editorRef.current, markers]);

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
          language: "javascript",
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
};

export default MonacoEditor;
