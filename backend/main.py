from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_

import models
import schemas
from database import engine, get_db, SessionLocal, Base

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ajaia Collaborative Docs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo/assessment scope only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_UPLOAD_EXTENSIONS = {".txt", ".md"}


def seed_users(db: Session):
    if db.query(models.User).count() > 0:
        return
    seed = [
        models.User(name="Alice Chen", email="alice@example.com"),
        models.User(name="Bob Ramirez", email="bob@example.com"),
        models.User(name="Carol Singh", email="carol@example.com"),
    ]
    db.add_all(seed)
    db.commit()


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_users(db)
    finally:
        db.close()


def get_user_or_404(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def doc_to_out(doc: models.Document, requesting_user_id: int) -> schemas.DocumentOut:
    return schemas.DocumentOut(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        owner_id=doc.owner_id,
        owner_name=doc.owner.name,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        is_owner=(doc.owner_id == requesting_user_id),
        shared_with=[schemas.UserOut.model_validate(s.user) for s in doc.shares],
    )


def get_accessible_doc_or_403(db: Session, doc_id: int, user_id: int) -> models.Document:
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    has_access = doc.owner_id == user_id or any(s.user_id == user_id for s in doc.shares)
    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    return doc


@app.get("/api/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id).all()


@app.get("/api/documents", response_model=list[schemas.DocumentOut])
def list_documents(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    owned = db.query(models.Document).filter(models.Document.owner_id == user_id)
    shared = (
        db.query(models.Document)
        .join(models.Share)
        .filter(models.Share.user_id == user_id)
    )
    docs = {d.id: d for d in owned}
    for d in shared:
        docs[d.id] = d
    ordered = sorted(docs.values(), key=lambda d: d.updated_at, reverse=True)
    return [doc_to_out(d, user_id) for d in ordered]


@app.post("/api/documents", response_model=schemas.DocumentOut)
def create_document(payload: schemas.DocumentCreate, db: Session = Depends(get_db)):
    get_user_or_404(db, payload.owner_id)
    doc = models.Document(title=payload.title, content=payload.content, owner_id=payload.owner_id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_to_out(doc, payload.owner_id)


@app.get("/api/documents/{doc_id}", response_model=schemas.DocumentOut)
def get_document(doc_id: int, user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    doc = get_accessible_doc_or_403(db, doc_id, user_id)
    return doc_to_out(doc, user_id)


@app.put("/api/documents/{doc_id}", response_model=schemas.DocumentOut)
def update_document(doc_id: int, payload: schemas.DocumentUpdate, user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    doc = get_accessible_doc_or_403(db, doc_id, user_id)
    if payload.title is not None:
        doc.title = payload.title
    if payload.content is not None:
        doc.content = payload.content
    db.commit()
    db.refresh(doc)
    return doc_to_out(doc, user_id)


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this document")
    db.delete(doc)
    db.commit()
    return {"ok": True}


@app.post("/api/documents/{doc_id}/share", response_model=schemas.DocumentOut)
def share_document(doc_id: int, payload: schemas.ShareCreate, db: Session = Depends(get_db)):
    get_user_or_404(db, payload.owner_id)
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != payload.owner_id:
        raise HTTPException(status_code=403, detail="Only the owner can share this document")

    target = db.query(models.User).filter(models.User.email == payload.target_email.strip().lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with that email")
    if target.id == doc.owner_id:
        raise HTTPException(status_code=400, detail="Document is already owned by this user")
    already_shared = db.query(models.Share).filter(
        models.Share.document_id == doc_id, models.Share.user_id == target.id
    ).first()
    if already_shared:
        raise HTTPException(status_code=400, detail="Already shared with this user")

    db.add(models.Share(document_id=doc_id, user_id=target.id))
    db.commit()
    db.refresh(doc)
    return doc_to_out(doc, payload.owner_id)


@app.post("/api/documents/upload", response_model=schemas.DocumentOut)
async def upload_document(
    owner_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    get_user_or_404(db, owner_id)

    filename = file.filename or "upload.txt"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only .txt and .md files are supported.",
        )

    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text")

    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")

    # Convert plain text into simple paragraph HTML for the editor
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    html = "".join(f"<p>{p.replace(chr(10), '<br/>')}</p>" for p in paragraphs) or "<p></p>"
    title = filename.rsplit(".", 1)[0][:100] or "Imported Document"

    doc = models.Document(title=title, content=html, owner_id=owner_id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_to_out(doc, owner_id)


@app.get("/api/health")
def health():
    return {"status": "ok"}
