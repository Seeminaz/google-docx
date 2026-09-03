import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

function ToolbarButton({ onClick, active, children, title, shortcut }) {
  return (
    <button
      type="button"
      className={`toolbar-btn ${active ? "active" : ""}`}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
      onClick={onClick}
      title={shortcut ? `${title} (${shortcut})` : title}
    >
      {children}
    </button>
  );
}

export default function Editor({ content, editable, onChange }) {
  // Tiptap can fire a synthetic onUpdate right after mount, before any user
  // edit. Skip forwarding a change if the HTML hasn't actually moved from
  // what the editor was initialized with, so opening a document never
  // triggers a spurious autosave.
  const [initialContent] = useState(() => content || "<p></p>");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === initialContent) return;
      onChange?.(html);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      {editable && (
        <div className="toolbar">
          <ToolbarButton
            title="Bold"
            shortcut={`${mod}+B`}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="material-symbols-outlined">format_bold</span>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            shortcut={`${mod}+I`}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="material-symbols-outlined">format_italic</span>
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            shortcut={`${mod}+U`}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="material-symbols-outlined">format_underlined</span>
          </ToolbarButton>
          <span className="toolbar-divider" />
          <ToolbarButton
            title="Heading 1"
            shortcut={`${mod}+Alt+1`}
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            shortcut={`${mod}+Alt+2`}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Paragraph"
            active={editor.isActive("paragraph")}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            P
          </ToolbarButton>
          <span className="toolbar-divider" />
          <ToolbarButton
            title="Bullet list"
            shortcut={`${mod}+Shift+8`}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <span className="material-symbols-outlined">format_list_bulleted</span>
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            shortcut={`${mod}+Shift+7`}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <span className="material-symbols-outlined">format_list_numbered</span>
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} className="editor-content" />
      {!editable && (
        <div className="readonly-badge">Read-only preview</div>
      )}
    </div>
  );
}
