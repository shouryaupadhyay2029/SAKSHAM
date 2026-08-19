# SAKSHAM FastAPI Service

This is the FastAPI-based backend service for SAKSHAM. Decoupled from direct persistence details via the Repository pattern, it operates completely in memory in this phase, allowing validation of stateless business logic, scoring engines, and transition state machines.

## Architecture

The project implements a clean domain-driven layering:

```
FastAPI Router -> Domain Services -> Repository Interfaces -> In-Memory Store
```

- **Domain Services**: Execute validation and matching calculations. Decoupled from persistence layers.
- **Repository Abstraction**: Defined abstract interfaces (`app/repositories/interfaces.py`) ensuring clean swaps to database adapters (e.g. SQLAlchemy/PostgreSQL) in subsequent phases.
- **Pydantic Schemas**: Provides strict data serialization and input validation.

## Local Setup & Run

1. **Navigate to the service folder**:
   ```bash
   cd services/fastapi
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the FastAPI app**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The server will run on `http://localhost:8000`.
   Open the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.

5. **Run test suite**:
   ```bash
   pytest
   ```

## Compatibility with Express Backend
This FastAPI service is designed to co-exist alongside the existing Express + Prisma service (`services/api`). The schemas, route payloads, response structures, and domain state-machines align exactly with the patterns defined in Backend Phases 1 and 2, facilitating a seamless gradual transition.
