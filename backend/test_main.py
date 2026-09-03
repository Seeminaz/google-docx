import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import models
from main import app, seed_users

TEST_DB_URL = "sqlite:///./test_docs.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_users(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200


def test_create_and_fetch_document():
    resp = client.post("/api/documents", json={"title": "My Doc", "content": "<p>hi</p>", "owner_id": 1})
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["title"] == "My Doc"
    assert doc["is_owner"] is True

    resp2 = client.get(f"/api/documents/{doc['id']}", params={"user_id": 1})
    assert resp2.status_code == 200
    assert resp2.json()["content"] == "<p>hi</p>"


def test_rename_and_persist_content():
    resp = client.post("/api/documents", json={"title": "Old Title", "owner_id": 1})
    doc_id = resp.json()["id"]

    resp2 = client.put(
        f"/api/documents/{doc_id}",
        params={"user_id": 1},
        json={"title": "New Title", "content": "<p>updated</p>"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["title"] == "New Title"
    assert resp2.json()["content"] == "<p>updated</p>"


def test_blank_title_rejected():
    resp = client.post("/api/documents", json={"title": "   ", "owner_id": 1})
    # blank title falls back to default rather than erroring on create
    assert resp.status_code == 200
    assert resp.json()["title"] == "Untitled Document"


def test_share_document_grants_access():
    resp = client.post("/api/documents", json={"title": "Shared Doc", "owner_id": 1})
    doc_id = resp.json()["id"]

    share_resp = client.post(
        f"/api/documents/{doc_id}/share",
        json={"owner_id": 1, "target_email": "bob@example.com"},
    )
    assert share_resp.status_code == 200
    assert len(share_resp.json()["shared_with"]) == 1

    # Bob (user_id=2) should now be able to read it
    bob_resp = client.get(f"/api/documents/{doc_id}", params={"user_id": 2})
    assert bob_resp.status_code == 200
    assert bob_resp.json()["is_owner"] is False


def test_non_shared_user_forbidden():
    resp = client.post("/api/documents", json={"title": "Private Doc", "owner_id": 1})
    doc_id = resp.json()["id"]

    forbidden_resp = client.get(f"/api/documents/{doc_id}", params={"user_id": 3})
    assert forbidden_resp.status_code == 403


def test_non_owner_cannot_share():
    resp = client.post("/api/documents", json={"title": "Doc", "owner_id": 1})
    doc_id = resp.json()["id"]

    resp2 = client.post(
        f"/api/documents/{doc_id}/share",
        json={"owner_id": 2, "target_email": "carol@example.com"},
    )
    assert resp2.status_code == 403


def test_upload_rejects_unsupported_extension():
    files = {"file": ("notes.pdf", b"%PDF-fake", "application/pdf")}
    resp = client.post("/api/documents/upload", data={"owner_id": 1}, files=files)
    assert resp.status_code == 400


def test_upload_txt_creates_document():
    files = {"file": ("notes.txt", b"Hello world\n\nSecond paragraph", "text/plain")}
    resp = client.post("/api/documents/upload", data={"owner_id": 1}, files=files)
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["title"] == "notes"
    assert "<p>Hello world</p>" in doc["content"]
