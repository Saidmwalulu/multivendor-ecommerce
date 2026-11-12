Unit tests using JEST
pnpm add --save-dev jest @types/jest supertest @types/supertest ts-jest

sudo systemctl start docker
sudo systemctl status docker 
docker ps
docker ps -a
docker compose up --build -d
docker stop postgres_db_ftalk
docker start postgres_db_ftalk
docker exec -it postgres_db_ftalk psql -U root -d freetalk_db