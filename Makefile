.PHONY: backend frontend dev

backend:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm start

dev:
	@trap 'kill 0' SIGINT; make backend & make frontend & wait

lint:
	cd frontend && npm run lint
	cd backend && ruff check . && ruff format --check .