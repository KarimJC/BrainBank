.PHONY: backend frontend dev lint

backend:
	cd backend && uvicorn main:app --reload

frontend:
	cd frontend && npm start

dev:
	@trap 'kill 0' SIGINT; make backend & make frontend & wait

lint:
	cd frontend && npm run lint
	cd backend && ruff check . && ruff format --check .