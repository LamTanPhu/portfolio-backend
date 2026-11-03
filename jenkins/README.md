# Local Jenkins lab (backend)

An optional second CI that mirrors `.github/workflows/ci.yml`. **GitHub Actions
stays the official CI** (it gates merges). Jenkins runs only while these
containers are up and never affects the repo, Render or the PR checks.

The pipeline (`../Jenkinsfile`): install, Prisma client, lint + build (parallel),
unit tests with coverage, e2e against a throwaway Postgres 16, then an audit of
`npm audit --audit-level=high` that marks the build *unstable* instead of failing it.

Two containers start together: Jenkins, and a disposable Postgres that only
Jenkins can reach (it publishes no port and stores nothing on disk).

## Start

```bash
cd jenkins
cp .env.example .env        # then set JENKINS_ADMIN_PASSWORD
docker compose up -d --build
```

The first build is slow (plugins, Node, npm). Open http://localhost:8081 and
sign in as `admin`. It listens on loopback only. This lab uses port **8081**, so
it can run next to the frontend lab on 8080.

## Create the pipeline job (once)

1. **Credentials.** Create a fine-grained GitHub token with read-only
   *Contents* and *Metadata* on the backend repo. In Jenkins: *Manage Jenkins >
   Credentials > System > Global > Add* (Username with password: your GitHub
   username and the token).
2. **New Item > Multibranch Pipeline.** Branch source: *GitHub*, pick the
   credentials, enter the backend repo URL.
3. **Scan Multibranch Pipeline Triggers:** tick *Periodically if not otherwise
   run* and choose 5 minutes. Jenkins polls GitHub, so no public tunnel or
   webhook is needed.
4. Save. It scans, finds the `Jenkinsfile` and builds each branch and PR.

Jenkins can only build what is on GitHub: commit and push the `Jenkinsfile`
before creating the job.

## Stop and remove

```bash
docker compose down        # stop (the test database is wiped; Jenkins data stays)
docker compose down -v     # stop and delete all Jenkins data
docker image rm portfolio-backend-jenkins:local   # free disk space
```

To drop Jenkins from the project entirely, delete this `jenkins/` folder and
the root `Jenkinsfile`. Nothing else references them.

## If something fails

- **E2E can't reach the database:** run `docker compose ps` and check that the
  `postgres` service is `healthy`. The pipeline connects to the host name
  `postgres`, which only exists inside this compose network.
- **`prisma migrate deploy` fails to download its engine:** the container needs
  internet access to fetch Prisma's binaries on the first run.
- **Out of memory:** raise `mem_limit` and `-Xmx` in the compose file.
- **`npm ci` complains the lockfile is out of sync:** this image uses npm 11. An
  older npm (10) reports false mismatches on this lockfile.
