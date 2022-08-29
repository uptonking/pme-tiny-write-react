import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { buildKeymap } from 'prosemirror-example-setup';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { schema as markdownSchema } from 'prosemirror-markdown';
import { Schema } from 'prosemirror-model';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';

import { ProseMirrorExtension } from '../state';

const plainSchema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM: (node) => [
        'p',
        { class: node.content.size > 500 ? 'truncate' : undefined },
        0,
      ],
    },
    text: {
      group: 'inline',
    },
  },
});

const blockquoteSchema = {
  content: 'block+',
  group: 'block',
  toDOM: () => ['div', ['blockquote', 0]],
};

export default (plain = false): ProseMirrorExtension => ({
  schema: () =>
    plain
      ? {
          nodes: plainSchema.spec.nodes,
          marks: plainSchema.spec.marks,
        }
      : {
          nodes: (markdownSchema.spec.nodes as any).update(
            'blockquote',
            blockquoteSchema,
          ),
          marks: markdownSchema.spec.marks,
        },
  plugins: (prev, schema) => [
    ...prev,
    keymap({
      Tab: sinkListItem(schema.nodes.list_item),
      'Shift-Tab': liftListItem(schema.nodes.list_item),
    }),
    keymap({ Tab: () => true }),
    keymap(buildKeymap(schema)),
    keymap(baseKeymap),
    history(),
    dropCursor({ class: 'drop-cursor' }),
  ],
});
