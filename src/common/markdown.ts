import markdownit from 'markdown-it';
import container from 'markdown-it-container';
import {
  MarkdownParser,
  MarkdownSerializer,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { Node, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

import { taskList } from '../prosemirror/extension/task-list/markdown';

export const serialize = (state: EditorState) => {
  let text = markdownSerializer.serialize(state.doc);
  if (text.charAt(text.length - 1) !== '\n') {
    text += '\n';
  }

  return text;
};

export const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    image(state, node) {
      const alt = state.esc(node.attrs.alt || '');
      const src = node.attrs.path ?? node.attrs.src;
      const title = node.attrs.title
        ? ` "${node.attrs.title.replace(/"/g, '\\"')}"`
        : '';
      state.write(`![${alt}](${src}${title})\n`);
    },
    container(state, node) {
      state.write(`::: ${node.attrs.type}\n`);
      state.renderContent(node);
      state.write(':::\n');
    },
    code_block(state, node) {
      const src = node.attrs.params.src;
      if (src) {
        const title = state.esc(node.attrs.params.title || '');
        state.write(`![${title}](${src})\n`);
        return;
      }

      state.write('```' + (node.attrs.params.lang || '') + '\n');
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write('```');
      state.closeBlock(node);
    },
    task_list(state, node) {
      state.renderList(node, '  ', () => '- ');
    },
    task_list_item(state, node) {
      state.write((node.attrs.checked ? '[x]' : '[ ]') + ' ');
      state.renderContent(node);
    },
    table(state, node) {
      function serializeTableRow(row: Node): string[] {
        const columnAlignment: string[] = [];
        let headerRow = false;
        row.forEach((cell) => {
          headerRow = cell.type.name === 'table_header';
          const alignment = serializeTableCell(cell);
          columnAlignment.push(alignment);
        });
        state.write('|');
        state.ensureNewLine();
        if (headerRow) {
          columnAlignment.forEach((alignment) => {
            state.write('|');
            state.write(
              alignment === 'left' || alignment === 'center' ? ':' : ' ',
            );
            state.write('---');
            state.write(
              alignment === 'right' || alignment === 'center' ? ':' : ' ',
            );
          });
          state.write('|');
          state.ensureNewLine();
        }
        return columnAlignment;
      }

      function serializeTableCell(cell: Node): string | null {
        state.write('| ');
        state.renderInline(cell);
        state.write(' ');
        return findAlignment(cell);
      }

      function findAlignment(cell: Node): string | null {
        const alignment = cell.attrs.style as string;
        if (!alignment) {
          return null;
        }

        const match = alignment.match(/text-align:[ ]?(left|right|center)/);
        if (match && match[1]) {
          return match[1];
        }

        return null;
      }

      node.forEach((table_child) => {
        serializeTableRow(table_child);
      });

      state.ensureNewLine();
      state.write('\n');
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    strikethrough: {
      open: '~~',
      close: '~~',
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  },
);

function listIsTight(tokens: any, i: number) {
  while (++i < tokens.length) {
    if (tokens[i].type != 'list_item_open') return tokens[i].hidden;
  }
  return false;
}

const md = markdownit({ html: false })
  .use(taskList)
  .use(container, 'tip')
  .use(container, 'warning')
  .use(container, 'details');

export const createMarkdownParser = (schema: Schema) =>
  new MarkdownParser(schema, md, {
    table: { block: 'table' },
    thead: { ignore: true },
    tbody: { ignore: true },
    th: {
      block: 'table_header',
      getAttrs: (tok) => ({ style: tok.attrGet('style') }),
    },
    tr: { block: 'table_row' },
    td: {
      block: 'table_cell',
      getAttrs: (tok) => ({ style: tok.attrGet('style') }),
    },
    container_tip: {
      block: 'container',
      getAttrs: () => ({ type: 'tip' }),
    },
    container_warning: {
      block: 'container',
      getAttrs: () => ({ type: 'warning' }),
    },
    container_details: {
      block: 'container',
      getAttrs: () => ({ type: 'details' }),
    },
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    task_list: { block: 'task_list' },
    task_list_item: {
      block: 'task_list_item',
      getAttrs: (tok) => ({ checked: tok.attrGet('checked') }),
    },
    list_item: { block: 'list_item' },
    bullet_list: {
      block: 'bullet_list',
      getAttrs: (_, tokens, i) => ({ tight: listIsTight(tokens, i) }),
    },
    ordered_list: {
      block: 'ordered_list',
      getAttrs: (tok, tokens, i) => ({
        order: +tok.attrGet('start') || 1,
        tight: listIsTight(tokens, i),
      }),
    },
    heading: {
      block: 'heading',
      getAttrs: (tok) => ({ level: +tok.tag.slice(1) }),
    },
    code_block: {
      block: 'code_block',
      noCloseToken: true,
    },
    fence: {
      block: 'code_block',
      getAttrs: (tok) => ({ params: { lang: tok.info } }),
      noCloseToken: true,
    },
    hr: { node: 'horizontal_rule' },
    image: {
      node: 'image',
      getAttrs: (tok) => ({
        src: tok.attrGet('src'),
        title: tok.attrGet('title') || null,
        alt: (tok.children[0] && tok.children[0].content) || null,
      }),
    },
    hardbreak: { node: 'hard_break' },
    em: { mark: 'em' },
    strong: { mark: 'strong' },
    s: { mark: 'strikethrough' },
    link: {
      mark: 'link',
      getAttrs: (tok) => ({
        href: tok.attrGet('href'),
        title: tok.attrGet('title') || null,
      }),
    },
    code_inline: { mark: 'code', noCloseToken: true },
  });
