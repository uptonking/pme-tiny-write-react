import { toBase64 } from 'js-base64';
import { EditorState } from 'prosemirror-state';

import * as clipboard from '@tauri-apps/api/clipboard';
import * as dialog from '@tauri-apps/api/dialog';
import * as fs from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import { getCurrent } from '@tauri-apps/api/window';

import { isTauri } from './env';
import { serialize } from './markdown';
import { Args } from './state';

export const saveSvg = (svg: HTMLElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const rect = svg.getBoundingClientRect();
  const ratio = rect.height / rect.width;
  canvas.width = 1080;
  canvas.height = 1080 * ratio;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const image = new Image();
  const svgString = svg.outerHTML
    .replaceAll('<br>', '<br/>')
    .replaceAll(/<img([^>]*)>/g, (m, g: string) => `<img ${g} />`);
  image.src = `data:image/svg+xml;base64,${toBase64(svgString)}`;
  image.decode().then(() => {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      const filename = 'mermaid-graph.png';
      if (isTauri) {
        const path = await dialog.save({ defaultPath: `./${filename}` });
        const buffer = await blob.arrayBuffer();
        const contents = new Uint8Array(buffer);
        await fs.writeBinaryFile({ path, contents });
        return;
      }

      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('download', filename);
      const url = URL.createObjectURL(blob);
      downloadLink.setAttribute('href', url);
      downloadLink.click();
    });
  });
};

export const getArgs = async (): Promise<Args> => {
  if (!isTauri) throw Error('Must be run in tauri');
  return await invoke('get_args');
};

export const setAlwaysOnTop = (alwaysOnTop: boolean): Promise<void> => {
  if (!isTauri) throw Error('Must be run in tauri');
  return getCurrent().setAlwaysOnTop(alwaysOnTop);
};

export const quit = (): Promise<void> => {
  if (!isTauri) throw Error('Must be run in tauri');
  return getCurrent().close();
};

export const isFullscreen = (): Promise<boolean> => {
  if (!isTauri) throw Error('Must be run in tauri');
  return getCurrent().isFullscreen();
};

export const setFullscreen = (status: boolean): Promise<void> => {
  if (!isTauri) throw Error('Must be run in tauri');
  return getCurrent().setFullscreen(status);
};

export const copy = async (text: string): Promise<void> => {
  if (isTauri) {
    return clipboard.writeText(text);
  } else {
    navigator.clipboard.writeText(text);
  }
};

export const copyAllAsMarkdown = async (state: EditorState): Promise<void> => {
  const text = serialize(state);
  if (isTauri) {
    return clipboard.writeText(text);
  } else {
    navigator.clipboard.writeText(text);
  }
};

export const getMimeType = async (path: string): Promise<string> => {
  if (!isTauri) throw Error('Must be run in tauri: getMimeType');
  return invoke('get_mime_type', { path });
};

export const getFileLastModified = async (path: string): Promise<Date> => {
  if (!isTauri) throw Error('Must be run in tauri: getFileLastModified');
  const ts = (await invoke('get_file_last_modified', { path })) as string;
  return new Date(ts);
};

export const readFile = async (path: string): Promise<string> => {
  if (!isTauri) throw Error('Must be run in tauri: readFile');
  return fs.readTextFile(path);
};

export const readBinaryFile = async (path: string): Promise<Uint8Array> => {
  if (!isTauri) throw Error('Must be run in tauri: readBinaryFile');
  return fs.readBinaryFile(path);
};

export const writeFile = async (
  path: string,
  contents: string,
): Promise<void> => {
  if (!isTauri) throw Error('Must be run in tauri: writeFile');
  return fs.writeFile({ path, contents });
};

export const resolvePath = async (paths: string[]): Promise<string> => {
  if (!isTauri) throw Error('Must be run in tauri: resolvePath');
  return invoke('resolve_path', { paths });
};

export const dirname = async (path: string): Promise<string> => {
  if (!isTauri) throw Error('Must be run in tauri: dirname');
  return invoke('dirname', { path });
};

export const save = async (state: EditorState): Promise<string> => {
  if (!isTauri) throw Error('Must be run in tauri: save');
  const path = await dialog.save();
  await fs.writeFile({ path, contents: serialize(state) });
  return path;
};
