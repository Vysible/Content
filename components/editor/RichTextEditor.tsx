'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export function RichTextEditor({ content, onChange, placeholder = 'Text eingeben…', minHeight = '400px' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [2, 3] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}`,
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border border-stone rounded-xl overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button
      key={label}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-2.5 py-1.5 text-sm rounded transition ${
        active
          ? 'bg-tiefblau text-white'
          : 'text-anthrazit hover:bg-stone'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-stone bg-stone/30">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'F', 'Fett')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'K', 'Kursiv')}
      <div className="w-px bg-stone mx-1" />
      {btn(
        editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        'H2', 'Überschrift 2'
      )}
      {btn(
        editor.isActive('heading', { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        'H3', 'Überschrift 3'
      )}
      <div className="w-px bg-stone mx-1" />
      {btn(
        editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        '• Liste', 'Aufzählung'
      )}
      {btn(
        editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        '1. Liste', 'Nummerierte Liste'
      )}
    </div>
  )
}
