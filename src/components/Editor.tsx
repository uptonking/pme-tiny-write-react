import React, { useEffect, useRef } from 'react';

import { css } from '@emotion/css';

import { useGlobalContext } from '../context';
import { editorCss } from './Layout';

// import {onMount} from 'solid-js'
// import {useState} from '../state'

export const TinyEditor = () => {
  // const [store, ctrl] = useState();
  const store = useGlobalContext((v) => v.store);
  const ctrl = useGlobalContext((v) => v.ctrl);

  const editorRef = useRef<HTMLDivElement>();

  // onMount(() => {
  //   ctrl.createEditorView(editorRef)
  // })
  useEffect(() => {
    if (editorRef.current) {
      console.log(';; ctrl.initEditorView1 ');
      ctrl.createEditorView(editorRef.current);
      console.log(';; ctrl.initEditorView2, ', store);
    }
  }, []);
  // console.log(';; ctrl.initEditorView2 ', store.editorView);

  const styles = () =>
    store.error
      ? css`
          display: none;
        `
      : css`
          ${editorCss(store.config)};
          ${store.markdown ? 'white-space: pre-wrap' : ''};
        `;

  return (
    <div
      ref={editorRef}
      className={styles()}
      spellCheck={false}
      data-tauri-drag-region='true'
    />
  );
};
