"use client";

import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

type CodeMirrorEditorProps = Omit<ReactCodeMirrorProps, "extensions">;

const CodeMirrorEditor = (props: CodeMirrorEditorProps) => {
  return <CodeMirror {...props} extensions={[javascript({ jsx: true })]} />;
};

export default CodeMirrorEditor;
