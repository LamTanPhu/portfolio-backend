// Local CI lab for the backend. GitHub Actions (.github/workflows/ci.yml)
// stays the official CI that gates merges; this mirrors it so the two can be
// compared. Setup and removal: jenkins/README.md
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        // The e2e stage shares one throwaway Postgres, so builds must not overlap.
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        CI = 'true'
        // Cache lives in the Jenkins volume, so repeat builds are much faster.
        npm_config_cache = "${env.JENKINS_HOME}/.npm"
    }

    stages {
        stage('Install') {
            steps {
                sh 'node --version && npm --version'
                sh 'npm ci --no-audit --no-fund'
            }
        }

        // Every repository and PrismaService imports types generated from
        // schema.prisma, so this must run before lint, build and tests.
        stage('Prisma client') {
            steps { sh 'npx prisma generate' }
        }

        stage('Static checks') {
            parallel {
                stage('Lint') {
                    // Check-only: `npm run lint` has --fix baked in, which would
                    // quietly correct itself into always passing.
                    steps { sh 'npx eslint "{src,apps,libs,test}/**/*.ts"' }
                }
                stage('Build') {
                    steps { sh 'npm run build' }
                }
            }
        }

        stage('Unit tests') {
            // The npm script already sets NODE_OPTIONS=--experimental-vm-modules.
            steps { sh 'npm test -- --ci --coverage' }
        }

        stage('E2E') {
            // Same throwaway values as the e2e job in ci.yml. Nothing here is a
            // real secret, and the database is a disposable container.
            environment {
                NODE_ENV = 'test'
                DATABASE_URL = 'postgresql://test:test@postgres:5432/portfolio_test?schema=public'
                JWT_SECRET = 'e2e-test-secret-do-not-use-in-production-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                COOKIE_SECRET = 'e2e-test-cookie-secret-do-not-use-in-production-aaaaaaaaaaaaaaaaaaaaaaaaaa'
                ADMIN_EMAIL = 'admin@example.test'
                ADMIN_PASSWORD = 'e2e-test-password'
                TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
                SNAKE_CAPTCHA_SECRET = 'e2e-test-snake-captcha-secret-do-not-use-in-production-aaaaaaaaaaaaaaaaaaaaaaaaaa'
                RESEND_API_KEY = 're_test_dummy_key'
            }
            steps {
                // The Postgres container is healthy before Jenkins starts; this
                // only guards against a slow restart. Plain bash, no psql needed.
                sh '''
                    timeout 60 bash -c 'until (echo > /dev/tcp/postgres/5432) 2>/dev/null; do sleep 2; done'
                '''
                // GitHub gives every run a brand-new database; this one persists
                // between builds, so wipe it first to keep runs comparable.
                sh '''
                    node -e "
                      const { Client } = require('pg');
                      (async () => {
                        const c = new Client({ connectionString: process.env.DATABASE_URL });
                        await c.connect();
                        await c.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
                        await c.end();
                      })().catch((e) => { console.error(e); process.exit(1); });
                    "
                '''
                sh 'npx prisma migrate deploy'
                sh 'npm run test:e2e'
            }
        }

        stage('Dependency audit') {
            steps {
                // ci.yml fails the build on this; here it only flags it, so a
                // newly published advisory can't block an unrelated change.
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh 'npm audit --audit-level=high'
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
        cleanup {
            cleanWs()
        }
    }
}
