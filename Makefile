# Better commands with error handling
build:
	docker compose -f dev.docker-compose.yml -p atom-class --env-file .env build --no-cache

start:
	docker compose -f dev.docker-compose.yml -p atom-class --env-file .env up -d

start-logs:
	docker compose -f dev.docker-compose.yml -p atom-class --env-file .env up

restart:
	docker compose -f dev.docker-compose.yml -p atom-class restart

down:
	docker compose -f dev.docker-compose.yml -p atom-class down

clean:
	docker compose -f dev.docker-compose.yml -p atom-class down -v --remove-orphans

logs:
	docker compose -f dev.docker-compose.yml -p atom-class logs -f

logs-server:
	docker compose -f dev.docker-compose.yml -p atom-class logs -f server

status:
	docker compose -f dev.docker-compose.yml -p atom-class ps