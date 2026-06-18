<h2>Backend starter Express with Docker and Postgres</h2>


<h3>Step</h3>
<pre>
DEVELOPMENT

cp .env.example .env
npm install
docker compose up --build -d
</pre>
note: prisma migrated automatically by docker compose, by executing docker compose up --build -d
execute npx prisma generate everytime change prisma scheme and docker compose up --build -d
execute docker compose down -v everytime added new library



<pre>
PRODUCTION

cp .env.example .env.production
npm install
docker build -t [image-name] .
docker run -p 3000:3000 --rm --env-file .env.production my-node-app:latest

docker sh
npx prisma migrate deploy
</pre>


<h3>Add user</h3>
add new user using becyrpt(10) as password
at local or your serverless DBMS postgree refer to .env configuration

<h3>Getting token as cookies</h3>
POST http://localhost:3000/api/auth/login<br>
<pre>
json body
{
  "email": "admin@email.com",
  "password": "123"
}
</pre>

<h3>Testing api</h3>
GET http://localhost:3000/api/master/users

<h3>Next PR</h3>