import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "./Editor";
import { api } from "./api";
import "./App.css";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function savedAgoLabel(savedAtMs) {
  if (!savedAtMs) return "Saved";
  const secs = Math.floor((Date.now() - savedAtMs) / 1000);
  if (secs < 3) return "Saved just now";
  if (secs < 60) return `Saved ${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Saved ${mins}m ago`;
  return "Saved";
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [, setTick] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const saveTimeout = useRef(null);
  const titleRef = useRef(null);
  const currentUser = users.find((u) => u.id === currentUserId);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api
      .listUsers()
      .then((u) => {
        setUsers(u);
        setCurrentUserId(u[0]?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const refreshDocuments = useCallback((userId) => {
    if (!userId) return;
    api
      .listDocuments(userId)
      .then(setDocuments)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (currentUserId) {
      refreshDocuments(currentUserId);
      setActiveDoc(null);
    }
  }, [currentUserId, refreshDocuments]);

  const openDocument = (doc) => {
    setError(null);
    api
      .getDocument(doc.id, currentUserId)
      .then((full) => {
        setActiveDoc(full);
        setSaveStatus("saved");
        setLastSavedAt(null);
      })
      .catch((e) => setError(e.message));
  };

  const createDocument = () => {
    api
      .createDocument(currentUserId)
      .then((doc) => {
        setDocuments((prev) => [doc, ...prev]);
        setActiveDoc(doc);
        setSaveStatus("saved");
        setLastSavedAt(null);
      })
      .catch((e) => setError(e.message));
  };

  const scheduleSave = useCallback(
    (docId, payload) => {
      setSaveStatus("saving");
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        api
          .updateDocument(docId, currentUserId, payload)
          .then((updated) => {
            setSaveStatus("saved");
            setLastSavedAt(Date.now());
            setDocuments((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
          })
          .catch((e) => {
            setSaveStatus("error");
            setError(e.message);
          });
      }, 600);
    },
    [currentUserId]
  );

  const handleContentChange = (html) => {
    if (!activeDoc) return;
    setActiveDoc((prev) => ({ ...prev, content: html }));
    scheduleSave(activeDoc.id, { content: html });
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setActiveDoc((prev) => ({ ...prev, title }));
    scheduleSave(activeDoc.id, { title });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    api
      .uploadDocument(currentUserId, file)
      .then((doc) => {
        setDocuments((prev) => [doc, ...prev]);
        setActiveDoc(doc);
        setSaveStatus("saved");
        setLastSavedAt(null);
      })
      .catch((err) => setError(err.message));
  };

  const submitDelete = () => {
    if (!activeDoc) return;
    clearTimeout(saveTimeout.current);
    setDeleting(true);
    setDeleteError(null);
    api
      .deleteDocument(activeDoc.id, currentUserId)
      .then(() => {
        setDocuments((prev) => prev.filter((d) => d.id !== activeDoc.id));
        setActiveDoc(null);
        setDeleteOpen(false);
      })
      .catch((err) => setDeleteError(err.message))
      .finally(() => setDeleting(false));
  };

  const submitShare = () => {
    if (!activeDoc) return;
    setShareError(null);
    api
      .shareDocument(activeDoc.id, currentUserId, shareEmail.trim().toLowerCase())
      .then((updated) => {
        setActiveDoc(updated);
        setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setShareEmail("");
        setShareOpen(false);
      })
      .catch((err) => setShareError(err.message));
  };

  if (loading) {
    return (
      <div className="center-msg">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Icon name="description" />
          </span>
          Ajaia Docs
        </div>
        <div className="user-switcher">
          <span className="user-avatar">{initials(currentUser?.name)}</span>
          <select
            value={currentUserId ?? ""}
            onChange={(e) => setCurrentUserId(Number(e.target.value))}
            aria-label="Signed in as"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} <span className="dismiss">✕</span>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-actions">
            <button className="primary-btn" onClick={createDocument}>
              <Icon name="add" className="btn-icon" />
              New Document
            </button>
            <button className="secondary-btn" onClick={handleUploadClick}>
              <Icon name="upload_file" className="btn-icon" />
              Upload .txt / .md
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              hidden
              onChange={handleFileSelected}
            />
          </div>
          <p className="hint">Only .txt and .md files are supported for import.</p>

          <div className="doc-list">
            {documents.length === 0 && (
              <div className="empty-state">
                <Icon name="description" />
                <p>No documents yet</p>
                <span>Create one or upload a file to get started.</span>
              </div>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`doc-item ${activeDoc?.id === doc.id ? "active" : ""}`}
                onClick={() => openDocument(doc)}
              >
                <div className="doc-item-title">{doc.title}</div>
                <div className="doc-item-meta">
                  <span className={`badge ${doc.is_owner ? "owned" : "shared"}`}>
                    {doc.is_owner ? "Owned" : "Shared with you"}
                  </span>
                  <span className="doc-item-time">{timeAgo(doc.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="editor-pane">
          {!activeDoc ? (
            <div className="center-msg">
              <div className="no-doc-illustration">
                <Icon name="description" />
                <p>Select or create a document to get started</p>
              </div>
            </div>
          ) : (
            <>
              <div className="editor-header">
                <input
                  ref={titleRef}
                  className="title-input"
                  value={activeDoc.title}
                  disabled={!activeDoc.is_owner}
                  onChange={handleTitleChange}
                />
                <div className="editor-header-actions">
                  <span className={`save-status ${saveStatus}`}>
                    {saveStatus === "saving" && (
                      <>
                        <span className="save-dot" /> Saving…
                      </>
                    )}
                    {saveStatus === "error" && (
                      <>
                        <Icon name="error" />
                        Save failed
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <Icon name="cloud_done" />
                        {savedAgoLabel(lastSavedAt)}
                      </>
                    )}
                  </span>
                  {activeDoc.is_owner && (
                    <button className="secondary-btn" onClick={() => setShareOpen(true)}>
                      Share
                    </button>
                  )}
                  {activeDoc.is_owner && (
                    <button
                      className="icon-btn danger"
                      title="Delete document"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteOpen(true);
                      }}
                    >
                      <Icon name="delete" />
                    </button>
                  )}
                </div>
              </div>

              {activeDoc.is_owner && activeDoc.shared_with?.length > 0 && (
                <div className="shared-with-row">
                  Shared with: {activeDoc.shared_with.map((u) => u.name).join(", ")}
                </div>
              )}
              {!activeDoc.is_owner && (
                <div className="shared-with-row">Shared by {activeDoc.owner_name} · view & edit access</div>
              )}

              <Editor
                key={activeDoc.id}
                content={activeDoc.content}
                editable={true}
                onChange={handleContentChange}
              />
            </>
          )}
        </main>
      </div>

      {shareOpen && (
        <div className="modal-backdrop" onClick={() => setShareOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share "{activeDoc?.title}"</h3>
            <p className="hint">Enter the email of a seeded user to grant access.</p>
            <input
              className="text-input"
              placeholder="e.g. bob@example.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            {shareError && <div className="inline-error">{shareError}</div>}
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShareOpen(false)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={submitShare}>
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete "{activeDoc?.title}"?</h3>
            <p className="hint">
              This can't be undone. The document will be permanently deleted
              {activeDoc?.shared_with?.length > 0 ? " for everyone it's shared with." : "."}
            </p>
            {deleteError && <div className="inline-error">{deleteError}</div>}
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="danger-btn" onClick={submitDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
