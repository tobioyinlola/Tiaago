"use client";

import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";

type CodeMirrorEditorProps = Omit<ReactCodeMirrorProps, "extensions">;

const mobileTheme = EditorView.theme({
  "&": { fontSize: "16px" },
  ".cm-content": { wordBreak: "break-word" },
});

const CodeMirrorEditor = (props: CodeMirrorEditorProps) => {
  return (
    <CodeMirror
      {...props}
      extensions={[javascript({ jsx: true }), EditorView.lineWrapping, mobileTheme]}
    />
  );
};

export default CodeMirrorEditor;
