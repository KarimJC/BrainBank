.PHONY: backend frontend dev lint format fix test test-backend test-backend-install

backend:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm start

dev:
	@trap 'kill 0' SIGINT; make backend & make frontend & wait

format:
	cd backend && ruff check --fix . && ruff format .

lint:
	cd frontend && npm run lint
	cd backend && ruff check . && ruff format --check .

fix:
	@echo "==> Fixing backend (ruff)..."
	cd backend && ruff check --fix . && ruff format .
	@echo "==> Fixing frontend (eslint)..."
	cd frontend && npx expo lint --fix
	@echo "==> Done."

test: test-backend

test-backend-install:
	cd backend && pip install -r requirements-dev.txt

test-backend:
	cd backend && pytest tests/ -v