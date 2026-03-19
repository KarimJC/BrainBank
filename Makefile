.PHONY: backend frontend dev lint format

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