# JAHEZ — Infrastructure (Terraform + AWS EKS)

Infrastructure-as-code for the Jahez food-delivery platform.
Everything on AWS, provisioned with Terraform, deployed via GitHub Actions.

## Architecture

```
                          Internet
                             │
                    ┌────────▼────────┐
                    │   CloudFront    │  ← Next.js web apps (client, dashboard, panel)
                    │   + S3 buckets  │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  ALB (Ingress)  │  ← AWS Load Balancer Controller
                    └────────┬────────┘
                             │
   ┌─────────────────────────▼──────────────────────────┐
   │                  EKS Cluster (Fargate/nodes)        │
   │   api-gateway · auth · order · delivery · restaurant│
   │   customer · manager · notification · payment · NATS│
   └───────┬───────────────────────────────┬────────────┘
           │                               │
   ┌───────▼────────┐              ┌────────▼────────┐
   │ RDS PostgreSQL │              │ ElastiCache     │
   │  (private)     │              │ Redis (private) │
   └────────────────┘              └─────────────────┘
```

## Layout

| Path | What it is | Status |
|------|-----------|--------|
| `bootstrap/` | S3 state bucket + DynamoDB lock (Phase 0) | ✅ applied |
| `terraform/` | Core stack: VPC, EKS, RDS, Redis, ECR ×9, Secrets, IRSA, uploads S3 | ✅ validated (99 resources planned) |
| `frontend/` | S3 + CloudFront per web app | ✅ validated |
| `k8s/jahez/` | Helm chart: NATS + 9 microservices + Ingress | ✅ lint+template OK |
| `scripts/install-alb-controller.sh` | One-time AWS Load Balancer Controller install | ✅ |
| `../.github/workflows/` | CI/CD: terraform-infra, deploy-services, deploy-frontend | ✅ |

## Deploy runbook (from zero to running)

```bash
# 0. State backend (already done)
cd infra/bootstrap && terraform apply

# 1. Core AWS infra — VPC, EKS, RDS, Redis, ECR, Secrets  (~20 min, billable)
cd ../terraform
terraform init
terraform apply            # creates 99 resources

# 2. Point kubectl at the new cluster
$(terraform output -raw configure_kubectl)

# 3. Install the ALB Ingress controller (one time)
bash ../scripts/install-alb-controller.sh

# 4. Build + push images and deploy services
#    -> done automatically by GitHub Actions on push to main,
#       or manually via the deploy-services workflow.

# 5. Frontends -> S3 + CloudFront (handled by deploy-frontend workflow)
```

## Required GitHub repo secrets

Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | access key for the `terraform-aws` IAM user |
| `AWS_SECRET_ACCESS_KEY` | its secret |

> The Next.js apps must set `output: "export"` in `next.config.ts` for the
> frontend workflow's static upload to S3 to work.

## Tear down (stop all billing)

```bash
cd infra/terraform && terraform destroy
cd ../frontend    && terraform destroy
# bootstrap bucket has prevent_destroy; remove that flag first if you really want it gone.
```

## Prerequisites (already verified ✅)

- AWS account `220719767281`, IAM user `terraform-aws`
- Terraform ≥ 1.5, AWS CLI v2, kubectl, helm
- Region: `eu-north-1`

## Phase 0 — one-time bootstrap

```bash
cd infra/bootstrap
terraform init
terraform apply
```

This creates the remote-state backend. After it exists, every other stack stores
its state in that S3 bucket. You only run this once.
