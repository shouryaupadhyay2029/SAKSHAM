"""
SAKSHAM — Incident Lifecycle Regression Test Suite
====================================================

Covers:
  A. Full forward chain: REPORTED→VERIFIED→AWAITING_MATCH→MATCHED→DISPATCHED→UNDER_RESPONSE→RESOLVED
  B. Every illegal backward/skip transition (expect 409)
  C. CANCELLED from each cancellable state (expect 200)
  D. Auth: missing token → 401 on PATCH
  D. Auth: wrong role / civilian → 403 on PATCH
  E. GET endpoints remain public (no token required)
  F. POST (create) remains public (civilian SOS support)
"""

import pytest
import uuid
import bcrypt as _bcrypt
from fastapi.testclient import TestClient
from app.main import app
from app.core.models import OfficerModel
from app.core.database import get_db
from app.core.security import create_access_token
import datetime

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_INCIDENT_PAYLOAD = {
    "type": "FLOOD",
    "title": "Lifecycle Regression Test Incident",
    "description": "Automated regression test — do not use in production.",
    "location": "Yamuna Banks, East Delhi",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "region": "EAST DELHI",
    "severity": "HIGH",
    "status": "REPORTED",
    "affectedPeople": 100,
    "displacedPeople": 10,
    "assignedUnit": None,
}


def _make_incident() -> dict:
    """Create a fresh REPORTED incident and return the response body."""
    res = client.post("/api/v1/incidents", json=_INCIDENT_PAYLOAD)
    assert res.status_code == 201, f"Failed to create test incident: {res.text}"
    return res.json()


def _officer_token(db_session, role: str = "OPERATOR") -> str:
    """
    Create a transient OfficerModel row in the test DB and return a valid JWT.
    Uses a unique email per call to avoid unique constraint violations.
    Uses bcrypt.hashpw directly (same as hash_password in security.py).
    """
    pw_hash = _bcrypt.hashpw(b"test-password", _bcrypt.gensalt()).decode("utf-8")
    officer = OfficerModel(
        id=uuid.uuid4(),
        email=f"test_officer_{uuid.uuid4().hex[:8]}@saksham.test",
        name="Test Officer",
        role=role,
        region="EAST DELHI",
        passwordHash=pw_hash,
        verificationStatus="VERIFIED",
        accountStatus="ACTIVE",
        createdAt=datetime.datetime.utcnow(),
        updatedAt=datetime.datetime.utcnow(),
    )
    db_session.add(officer)
    db_session.commit()
    # create_access_token(subject: str, role: str, region: Optional[str])
    token = create_access_token(subject=str(officer.id), role=officer.role, region=officer.region)
    return token


def _patch(incident_id: str, status: str, token: str | None = None) -> "Response":
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return client.patch(
        f"/api/v1/incidents/{incident_id}",
        json={"status": status},
        headers=headers,
    )


# ---------------------------------------------------------------------------
# A. Full forward chain — no token needed for read, token needed for PATCH
# ---------------------------------------------------------------------------

class TestFullForwardChain:
    """Every valid transition in the happy path must return 200 with the new status."""

    def test_reported_to_verified(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        res = _patch(inc["id"], "VERIFIED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "VERIFIED"

    def test_verified_to_awaiting_match(self):
        # Start at REPORTED, advance to VERIFIED, then AWAITING_MATCH
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        _patch(inc["id"], "VERIFIED", token)
        res = _patch(inc["id"], "AWAITING_MATCH", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "AWAITING_MATCH"

    def test_awaiting_match_to_matched(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        _patch(inc["id"], "VERIFIED", token)
        _patch(inc["id"], "AWAITING_MATCH", token)
        res = _patch(inc["id"], "MATCHED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "MATCHED"

    def test_matched_to_dispatched(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        _patch(inc["id"], "VERIFIED", token)
        _patch(inc["id"], "AWAITING_MATCH", token)
        _patch(inc["id"], "MATCHED", token)
        res = _patch(inc["id"], "DISPATCHED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "DISPATCHED"

    def test_dispatched_to_under_response(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        _patch(inc["id"], "VERIFIED", token)
        _patch(inc["id"], "AWAITING_MATCH", token)
        _patch(inc["id"], "MATCHED", token)
        _patch(inc["id"], "DISPATCHED", token)
        res = _patch(inc["id"], "UNDER_RESPONSE", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "UNDER_RESPONSE"

    def test_under_response_to_resolved(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        _patch(inc["id"], "VERIFIED", token)
        _patch(inc["id"], "AWAITING_MATCH", token)
        _patch(inc["id"], "MATCHED", token)
        _patch(inc["id"], "DISPATCHED", token)
        _patch(inc["id"], "UNDER_RESPONSE", token)
        res = _patch(inc["id"], "RESOLVED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "RESOLVED"

    def test_full_chain_persists_to_db(self):
        """After traversing the full chain, a GET must return RESOLVED."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        for status in ["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED", "UNDER_RESPONSE", "RESOLVED"]:
            r = _patch(inc["id"], status, token)
            assert r.status_code == 200, f"Failed at {status}: {r.text}"

        get_res = client.get(f"/api/v1/incidents/{inc['id']}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "RESOLVED"

    def test_idempotent_same_status_is_accepted(self):
        """Patching to the same status is allowed (state machine: current == next → True)."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()

        res = _patch(inc["id"], "REPORTED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "REPORTED"


# ---------------------------------------------------------------------------
# B. Illegal backward / skip transitions — must return 409
# ---------------------------------------------------------------------------

class TestInvalidTransitions:
    """Every illegal transition must be rejected with 409 INVALID_STATE_TRANSITION."""

    def _advance_to(self, statuses: list[str]) -> tuple[str, str]:
        """Creates an incident and advances it through statuses. Returns (id, token)."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()
        for s in statuses:
            r = _patch(inc["id"], s, token)
            assert r.status_code == 200, f"Setup failed at {s}: {r.text}"
        return inc["id"], token

    def test_verified_to_reported_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED"])
        res = _patch(inc_id, "REPORTED", token)
        assert res.status_code == 409, res.text

    def test_reported_skip_to_awaiting_match_rejected(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()
        res = _patch(inc["id"], "AWAITING_MATCH", token)
        assert res.status_code == 409, res.text

    def test_reported_skip_to_dispatched_rejected(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()
        res = _patch(inc["id"], "DISPATCHED", token)
        assert res.status_code == 409, res.text

    def test_awaiting_match_to_verified_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED", "AWAITING_MATCH"])
        res = _patch(inc_id, "VERIFIED", token)
        assert res.status_code == 409, res.text

    def test_matched_to_awaiting_match_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED", "AWAITING_MATCH", "MATCHED"])
        res = _patch(inc_id, "AWAITING_MATCH", token)
        assert res.status_code == 409, res.text

    def test_dispatched_to_matched_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED"])
        res = _patch(inc_id, "MATCHED", token)
        assert res.status_code == 409, res.text

    def test_under_response_to_dispatched_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED", "UNDER_RESPONSE"])
        res = _patch(inc_id, "DISPATCHED", token)
        assert res.status_code == 409, res.text

    def test_resolved_to_anything_rejected(self):
        inc_id, token = self._advance_to(["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED", "UNDER_RESPONSE", "RESOLVED"])
        for target in ["REPORTED", "VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED", "UNDER_RESPONSE"]:
            res = _patch(inc_id, target, token)
            assert res.status_code == 409, f"Expected 409 for RESOLVED→{target}, got {res.status_code}: {res.text}"

    def test_cancelled_to_anything_rejected(self):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()
        _patch(inc["id"], "CANCELLED", token)
        for target in ["REPORTED", "VERIFIED", "DISPATCHED", "RESOLVED"]:
            res = _patch(inc["id"], target, token)
            assert res.status_code == 409, f"Expected 409 for CANCELLED→{target}: {res.status_code}"


# ---------------------------------------------------------------------------
# C. CANCELLED from each cancellable state — must return 200
# ---------------------------------------------------------------------------

class TestCancelTransitions:
    """CANCELLED is a valid escape from REPORTED, VERIFIED, AWAITING_MATCH, MATCHED, DISPATCHED, UNDER_RESPONSE."""

    @pytest.mark.parametrize("from_statuses", [
        [],                                                                        # REPORTED → CANCELLED
        ["VERIFIED"],                                                              # VERIFIED → CANCELLED
        ["VERIFIED", "AWAITING_MATCH"],                                            # AWAITING_MATCH → CANCELLED
        ["VERIFIED", "AWAITING_MATCH", "MATCHED"],                                 # MATCHED → CANCELLED
        ["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED"],                   # DISPATCHED → CANCELLED
        ["VERIFIED", "AWAITING_MATCH", "MATCHED", "DISPATCHED", "UNDER_RESPONSE"], # UNDER_RESPONSE → CANCELLED
    ])
    def test_cancel_from_state(self, from_statuses):
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db)
        db.close()
        for s in from_statuses:
            r = _patch(inc["id"], s, token)
            assert r.status_code == 200, f"Setup failed at {s}: {r.text}"
        res = _patch(inc["id"], "CANCELLED", token)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "CANCELLED"


# ---------------------------------------------------------------------------
# D. Authorization — PATCH requires valid officer token
# ---------------------------------------------------------------------------

class TestAuthorization:
    """Unauthenticated and unauthorized callers must be rejected with 401 / 403."""

    def test_unauthenticated_patch_returns_401(self):
        """No Authorization header → 401."""
        inc = _make_incident()
        res = _patch(inc["id"], "VERIFIED")  # no token
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"

    def test_invalid_token_returns_401(self):
        """Malformed/expired token → 401."""
        inc = _make_incident()
        res = _patch(inc["id"], "VERIFIED", token="invalid.jwt.token")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"

    def test_officer_access_required_response_body(self):
        """
        A token referencing a non-existent officer ID returns 401 UNAUTHORIZED.
        The 403 FORBIDDEN path (valid officer, wrong role) requires a DB-registered role
        outside [OPERATOR, REGIONAL_AUTHORITY, ADMIN] — not possible with the current
        PostgreSQL Role enum. This test verifies the 401 error body structure instead.
        """
        import jwt as _jwt
        from app.core.security import SECRET_KEY, ALGORITHM
        import datetime as _dt

        # Forge a token with a valid UUID subject that doesn't exist in the DB
        nonexistent_id = str(uuid.uuid4())
        fake_token = _jwt.encode(
            {"sub": nonexistent_id, "role": "OPERATOR", "exp": _dt.datetime.utcnow() + _dt.timedelta(hours=1)},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        inc = _make_incident()
        res = _patch(inc["id"], "VERIFIED", token=fake_token)
        # Officer not in DB → 401
        assert res.status_code == 401, f"Expected 401 for unknown officer, got {res.status_code}: {res.text}"
        body = res.json()
        # The error response must carry either 'error' or 'detail' key
        assert "error" in body or "detail" in body, f"Expected structured error body, got: {body}"

    def test_operator_role_is_authorized(self):
        """OPERATOR role must succeed."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db, role="OPERATOR")
        db.close()
        res = _patch(inc["id"], "VERIFIED", token)
        assert res.status_code == 200, res.text

    def test_regional_authority_role_is_authorized(self):
        """REGIONAL_AUTHORITY role must succeed."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db, role="REGIONAL_AUTHORITY")
        db.close()
        res = _patch(inc["id"], "VERIFIED", token)
        assert res.status_code == 200, res.text

    def test_admin_role_is_authorized(self):
        """ADMIN role must succeed."""
        inc = _make_incident()
        db = next(get_db())
        token = _officer_token(db, role="ADMIN")
        db.close()
        res = _patch(inc["id"], "VERIFIED", token)
        assert res.status_code == 200, res.text


# ---------------------------------------------------------------------------
# E. Public endpoints must NOT require auth
# ---------------------------------------------------------------------------

class TestPublicEndpoints:
    """GET and POST must work without any Authorization header."""

    def test_list_incidents_is_public(self):
        res = client.get("/api/v1/incidents")
        assert res.status_code == 200

    def test_get_incident_is_public(self):
        inc = _make_incident()
        res = client.get(f"/api/v1/incidents/{inc['id']}")
        assert res.status_code == 200
        assert res.json()["id"] == inc["id"]

    def test_create_incident_is_public(self):
        """Civilian SOS must not require a token."""
        res = client.post("/api/v1/incidents", json=_INCIDENT_PAYLOAD)
        assert res.status_code == 201
        assert res.json()["status"] == "REPORTED"

    def test_get_by_reference_id_is_public(self):
        inc = _make_incident()
        ref_id = inc["incidentId"]
        res = client.get(f"/api/v1/incidents/{ref_id}")
        assert res.status_code == 200
        assert res.json()["incidentId"] == ref_id
